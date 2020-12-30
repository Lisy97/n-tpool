const thrift = require('thrift');
const genericPool = require('generic-pool');

const default_p_opts = require('./poolConfig.js');
const default_t_opts = require('./thrifConfig.js');

function createThriftConnection(host, port, option, constructor, serviceName) {
	return new Promise((resolve, reject) => {
		const connection = thrift.createConnection(host, port, option);
		connection.on('connect', function() { resolve(connection) })
			.on('timeout', function() {
				reject('连接超时');
				connection.destroy(new Error('连接超时'));
			}).on('error', function(err) { reject(err.message); })
			.on('close', function(err) { reject('连接关闭'); });
	}).then(connection => {
		connection.removeAllListeners('timeout')
			.removeAllListeners('error')
			.removeAllListeners('close')
			.on('timeout', function() {
				this.requestState = '请求超时';
			}).on('error', function(err) {
				this.requestState = `请求发生错误：${err.message}`;
			}).on('close', function() {
				this.requestState = `[${host}:${port}]服务关闭`;
			});
		if (serviceName) {
			const m = new thrift.Multiplexer();
			m.createClient(serviceName, constructor, connection);
		} else {
			thrift.createClient(constructor, connection);
		}
		return connection;
	});
}
// 每次执行方法添加连接监听
function listenError(connection, reject) {
	function onTimeout() { reject('请求超时。') }
	function onError(err) {
		if (connection.connected) {
			reject(`请求发生异常：${err.message}`);
		} else {
			reject(`请求发生异常：网络中断。`);
		} 
	}
	function onClose() { reject(`[${connection.host}:${connection.port}]服务关闭`) }
	connection.on('timeout', onTimeout).on('close', onClose).on('error', onError);
	return { onTimeout, onError, onClose };
}
// 方法执行函数
function invoke(serviceName, methodName, pool) {
	return function(...args) {
		return pool.acquire().catch((e) => {
		  return Promise.reject('获取thrift连接失败：可能网络中断或者服务关闭');
		}).then((connection) => {
			let client = connection.client;
			client = serviceName ? client[serviceName] : client;
			return new Promise((resolve, reject) => {
				const { onTimeout, onError, onClose } = listenError(connection, reject);
				client[methodName](...args).then(res => {
					connection.removeListener('timeout', onTimeout).removeListener('close', onClose).removeListener('error', onError);
					pool.release(connection);
					resolve(res);
				}).catch(err => {
					connection.removeListener('timeout', onTimeout).removeListener('close', onClose).removeListener('error', onError);
					if (connection.connected) {
						pool.release(connection);
					} else {
						pool.destroy(connection);
					}
					reject(err);
				});
			});
		});
	}
}
// 连接池初始化函数
function ntpool(constructor, thriftOption, poolOption) {
	const port = thriftOption.port,
		host = thriftOption.host,
		serviceName = thriftOption.serviceName;
	const t_opts = Object.assign(default_t_opts, thriftOption),
		p_opts = Object.assign(default_p_opts, poolOption);
	
	const factory = {
		create: function() {
			return createThriftConnection(host, port, t_opts, constructor, serviceName);
		},
		destroy: function(resource) {
			return Promise.resolve(resource.destroy());
		},
		validate: function(resource) {
			return new Promise(resolve => { 
				return resolve(resource.connected);
			});
		}
	};
	
	const myPool = genericPool.createPool(factory, p_opts);
	
	return Object.keys(constructor.Client.prototype)
		.filter((methodName, i, arr) => {
			return arr.includes(`send_${methodName}`);
		}).reduce((t, methodName) => {
			t[methodName] = invoke(serviceName, methodName, myPool);
			return t;
		}, {});
}

module.exports = ntpool;
