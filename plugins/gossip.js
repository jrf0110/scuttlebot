var pull = require('pull-stream')

function all(stream, cb) {
  if (cb) return pull(stream, pull.collect(cb))
  else return function (cb) {
    pull(stream, pull.collect(cb))
  }
}

function peers (server, cb) {
  var config = server.config

  var seeds = config.seeds
  seeds =
    ( isArray(seeds)  ? seeds
    : isObject(seeds) ? [seeds]
    : [])

  pull(
    server.ssb.messagesByType('pub'),
    pull.map(function (e) {
      return e.content.address
    }),
    pull.filter(function (e) {
      return e.port !== config.port || e.host !== config.host
    }),
    pull.collect(function (err, ary) {
      cb(null, (ary || []).concat(seeds))
    })
  )

}

var isArray = Array.isArray

function isObject (o) {
  return o && 'object' === typeof o
}

module.exports = function (server) {
  var config = server.config

  server.on('authorized', function (rpc) {
    rpc.once('replicated', function () {
      rpc.close(function (err) {
        //connect again...
        setTimeout(connect, 1000 + Math.random() * 3000)
        if(err) console.error(err.stack)
      })
    })
  })

  server.on('unauthorized', function (rpc) {
    setTimeout(connect, 1000 + Math.random() * 3000)
  })

  function connect () {
    peers(server, function (err, ary) {
      var p = ary[~~(Math.random()*ary.length)]
      //connect to this random peer
      //the replication plugin handle it from here.
      if(p) server.connect(p, function (err) {
        setTimeout(connect, 1000 + Math.random()*3000)
      })
      else setTimeout(connect, 1000 + Math.random()*3000)
    })
  }

  connect()
}