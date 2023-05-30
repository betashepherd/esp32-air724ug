load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_pppos.js');
load('api_timer.js');
load('api_sys.js');
load('api_net.js');

let led = Cfg.get('board.led1.pin');              // Built-in LED GPIO number
let device_id = Cfg.get('device.id');
let topic = '';

//////////////////////////
let gsmPwrKeyPin = 5;
//////////////////////////
GPIO.set_mode(gsmPwrKeyPin, GPIO.MODE_OUTPUT);

Timer.set(1000, 0, function () {
    // Wait for sometime
}, null);
GPIO.write(gsmPwrKeyPin, 0);

let pubData = function() {
  return JSON.stringify({
    total_ram: Sys.total_ram(),
    free_ram: Sys.free_ram(),
    imei: PPPOS.imei(),
    iccid: PPPOS.iccid(),
    time: Timer.fmt("%F %T", Timer.now() + 28800)
  });
};

// Blink built-in LED every second
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
Timer.set(1000 /* 1 sec */, Timer.REPEAT, function() {
  let value = GPIO.toggle(led);
  print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime());
  if (topic === '' && PPPOS.iccid() !== '') {
    topic = '/' + device_id + '/' + PPPOS.iccid();
  }
}, null);

// Update state every second, and report to cloud if online
Timer.set(5000, Timer.REPEAT, function () {
    if (topic !== '') {
      MQTT.pub(topic, pubData(), 1);
      print("==== MQTT pub:", topic);
    }
}, null);

// Monitor network connectivity.
Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('==== Net event:', ev, evs);
}, null);

//MQTT monitor
MQTT.setEventHandler(function(conn, ev, edata) {
  let evs = '???';
  if (ev !== 0) {
    if (ev === MQTT.EV_CONNACK) {
      evs = 'CONNACK';
    } else if (ev === MQTT.EV_PUBLISH) {
      evs = 'PUBLISH';
    } else if (ev === MQTT.EV_PUBACK) {
      evs = 'PUBACK';
    } else if (ev === MQTT.EV_SUBACK) {
      evs = 'SUBACK';
    } else if (ev === MQTT.EV_UNSUBACK) {
      evs = 'UNSUBACK';
    } else if (ev === MQTT.CLOSE) {
      evs = 'CLOSE';
    }
    print('==== MQTT event:', evs);
  }
}, null);
