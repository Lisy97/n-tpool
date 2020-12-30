const thrift = require('thrift');
const mypool = require('./index.js');

const UC = require('./user/index.js');
const DC = require('./data/index');


const dc = mypool(DC, {
	host: '47.104.178.209',
	port: 33213,
	serviceName: 'DataIface'
});
dc.getDataTypeList().then(data => {
	console.log(data);
}).catch(err => {
	console.log(err);
})
// const host = '47.104.178.209',
// 	port = 33206;

// const client = mypool(UC, {host, port}, {});
// console.log(client);
// client.getUserList().then(data => {
// 	console.log(11, data)
// }).catch(err => {
// 	console.log(11, err)
// });

// const net = require('net');

// const s  = net.connect({ host: '47.104.178.209', port: 33206 });
// s.on('close', function(err) {
// 	console.log(err ? '错误关闭' : '正常关闭');
// }).on('connect', function() {
// 	console.log('连接成功');
// 	s.destroy();
// }).on('timeout', function() {
// 	console.log('连接超时');
// 	s.destroy();
// })
	
// const uc = require('./user/index.js');
// console.log(Object.keys(uc.Client.prototype).filter(function(item, i, arr) {
// 	return arr.includes(`send_${item}`);
// }));
