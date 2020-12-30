const thrift = require('thrift');
const mypool = require('./index2.js');

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
	
