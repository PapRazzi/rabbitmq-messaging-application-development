require('../setup').Init('Complex Routing Consumer.');
var orderService = require('./orderService');
var connect = require('amqp').createConnection();
var logging = require('./logging');
var logger = new logging();

connect.on('ready', function() {
    var ex = connect.exchange('shop.exchange', {type: 'direct', confirm:true});
    var q = connect.queue('shop.queue', {durable:true, autoDelete:false});

    q.on('queueDeclareOk', function(args) {
        q.bind('shop.exchange', 'order.key');
        q.on('queueBindOk', function() {
            q.subscribe({ack:true}, function(message) {
                var service = new orderService(unescape(message.data));
                var status = service.ProcessOrder();
                if (status === 'OrderComplete') {
                   var exf = connect.exchange('shop.fanout.exchange', {type: 'fanout'});
                   exf.publish('', JSON.stringify(service.Order));
                }
                q.shift();
                logger.Log("Consumer", "WARN", "Remove order from queue");
            });
        });
    });
});