# n-tpool

#### 介绍
实现一个node客户端thrift连接池。基于Promise API接收trift服务返回的数据。
可创建一个端口一个服务的连接池，也可以创建单端口富应用的连接池。 

#### 软件架构
使用generic-pool和thrift。


#### 安装教程

1.  npm i
2.  示例：
```
const mypool = require('n-tpool');
// 我的thrift客户端文件
var  Service = require('./Service');

var thriftConfig = {
  host: '127.0.0.1',
  port: 33206
}
// 调用创建连接池
// Service: thrift生成的nodejs文件
// thriftConfig: thrift连接参数项，[host,port]必须要传
// 第三个参数格式: { serviceName, poolOptions}
// serviceName: 当服务是单端口富应用时，这个字段就是服务名
// poolOptions: 是generic-pool配置项，默认了一些配置
var client = mypool(Service, thriftConfig, {});
// 可以直接通过client.method().then(data => console.log(data)).catch(err => console.log(err))
// 调用thrift客户端方法，并取得返回值。
// 当服务端关闭时，这个线程池也不会退出，每次调用也会尝试创建连接，直到服务重新启动
// poolOptions是连接池配置，具体配置参考：[https://github.com/coopernurse/node-pool#readme](https://github.com/coopernurse/node-pool)
```


