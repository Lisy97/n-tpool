var  Service = require('./user');
var mypool = require('./index');

var thriftConfig = {
  host: '127.0.0.1',
  port: 33206
}

var client = mypool(Service, thriftConfig, {});

function run(title, num) {
  for (let index = 0; index < num; index++) {
    client.getUserList().then(data => { // 1
      console.log(title, index, '-正常')
    }).catch(err => {
      console.log(title, index, '-异常')
    });
  }
}

run('第一波', 3);
setTimeout(run, 15*1000, '第二波', 2);
setTimeout(run, 40*1000, '第三波', 5);
setTimeout(run, 90*1000, '第四波', 3);
