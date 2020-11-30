const thrift = require('thrift');
const GenericPool = require('generic-pool');

const listenError = (connection, reject) => {
  const onTimeout = (err) => {
    connection.alive = false;
    reject(err || '连接超时');
  };
  const onError = (err) => {
    connection.alive = false;
    reject(err || '连接异常');
  }
  const onClose = (err) => {
    connection.alive = false;
    reject(err || '连接关闭');
  }
  connection.on('timeout', onTimeout).on('close', onClose).on('error', onError);
  return { onTimeout, onError, onClose };
}
const detachListenError = (connection, { onTimeout, onClose, onError }) => {
  connection.removeListener('timeout', onTimeout).removeListener('close', onClose).removeListener('error', onError);
};

const createThriftConnection = (opitons) => {
  const { host, port } = opitons;
  let connection, errCallbacks;
  return new Promise((resolve, reject) => {
    connection = thrift.createConnection(host, port, opitons);
    errCallbacks = listenError(connection, reject);
    connection.on('connect', resolve)
      .on('timeout', () => { connection.alive = false; })
      .on('close', () => { connection.alive = false; })
      .on('error', () => { connection.alive = false; });
  }).then(() => {
    detachListenError(connection, errCallbacks);
    connection.alive = true;
    return connection;
  }).catch(err => {
    detachListenError(connection, errCallbacks);
    throw err;
  });
}

const createThriftClient = (clientConstructor, connection, serviceName) => {
  let client;
  if (serviceName) {
    const m = new thrift.Multiplexer();
    client = m.createClient(serviceName, clientConstructor, connection);
  } else {
    client = thrift.createClient(clientConstructor, connection);
  }
  return client;
}

const pooledRpc = (clientConstructor, serviceName, rpc, pool) => (...args) => {
  return pool.acquire().catch((e) => {
    return Promise.reject(`获取thrift连接失败：${e.message}`)
  }).then((connection) => {
    let errCallbacks;
    return new Promise((resolve, reject) => {
      errCallbacks = listenError(connection, reject);
      const client = createThriftClient(clientConstructor, connection, serviceName);
      resolve(client[rpc](...args));
    }).then((response) => {
      detachListenError(connection, errCallbacks);
      pool.release(connection);
      return response;
    }).catch((error) => {
      detachListenError(connection, errCallbacks);
      pool.release(connection);
      throw error;
    });
  });
};

const DEFAULT_POOL_OPTIONS = {
  max: 5,
  min: 0,
  idleTimeoutMillis: 20 * 1000,
  acquireTimeoutMillis: 5 * 1000,
  testOnBorrow: true,
  evictionRunIntervalMillis: 1000,
};

const DEFAULT_THRIFT_OPTIONS = {
  transport: thrift.TBufferedTransport,
  protocol: thrift.TBinaryProtocol,
  timeout: 30 * 60 * 1000,
  max_attempts: 1,
};

module.exports = (clientConstructor, thriftOptions, clientOptions) => {
  if (!thriftOptions.host || !thriftOptions.port) {
    throw new Error('PooledThriftClient: both host and port must be specified');
  }
  const serviceName = clientOptions.serviceName || null;
  thriftOptions = Object.assign({}, DEFAULT_THRIFT_OPTIONS, thriftOptions);
  const poolOptions = Object.assign(
    {},
    DEFAULT_POOL_OPTIONS,
    clientOptions.poolOptions
  );

  const factory = {
    create: () => createThriftConnection(thriftOptions),
    destroy: (connection) =>  new Promise((resolve) => resolve(connection.end())),
    validate: (connection) => new Promise((resolve) => {
        resolve(connection.alive && connection.connected);
      })
  }
  const pool = GenericPool.createPool(factory, poolOptions);
  pool.start();

  const clientClass = clientConstructor.Client.prototype;
  return Object.keys(clientClass).filter((k) => {
    return clientClass.hasOwnProperty(`send_${k}`);
  }).reduce((thriftClient, rpc) => {
    thriftClient[rpc] = pooledRpc(clientConstructor, serviceName, rpc, pool);
    return thriftClient;
  }, {});
};
