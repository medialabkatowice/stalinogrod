;(function () {
  $.getJSON('./public/javascript/transparents.json', function (transparents) {
  
    // pins
    var pins = [{
        x: 300, 
        y: 300,
        img: '001.jpg',
        title: 'Janek lubi czarne jagody',
        desc: 'To jest kawałek tekstu, który zostanie wprowadzony w system'
    }, {
        x: 350, 
        y: 325,
        img: '002.png',
        title: 'Janek lubi czarne jagody',
        desc: 'To jest kawałek tekstu, który zostanie wprowadzony w system'
    }, {
        x: 599, 
        y: 465,
        img: '003.jpg',
        title: 'Janek lubi czarne jagody',
        desc: 'To jest kawałek tekstu, który zostanie wprowadzony w system'
    }];

    // map vars
    var layers  = ["przyroda", "drogi", "zabudowa"];
    var periods = ["1906", "wielkie", "70", "wspolczesna"];
    var labels  = {"1906": "1906",  "wielkie"    : "1934",
                   "70"  : "1978",  "wspolczesna": "2013" };

    var tile_size   = 150;
    var canvas_dims = [{}, {w:  900, h: 1000}, {w: 1800, h: 2000}, 
                           {w: 2700, h: 3000}, {w: 3600, h: 4000}];

    // current state vars
    var zoom = 3;
    var current = {"1906": [],  "wielkie"    : [],
                   "70"  : [],  "wspolczesna": [] };
    var loaded = {};
    var hidden = {};
    
    // html vars
    var viewport = {
      el : $('#viewport'),
      geo: {
        w: $('#viewport').width(),
        h: $('#viewport').height()
      },
      off: $('#viewport').offset()
    };
    var map = {
      el : $('#map'),
      geo: {
        w: $('#map').width(),
        h: $('#map').height()
      },
      off: {
        left: viewport.off.left - (canvas_dims[zoom].w / 3),
        top : viewport.off.top  - (canvas_dims[zoom].h / 3)
      }
    };
    map.el.offset(map.off);


    // drag map handler
    viewport.el.mousedown(function (down_event) {
      var down_mouse_x = down_event.pageX;
      var down_mouse_y = down_event.pageY;
      var down_map_x = map.off.left;
      var down_map_y = map.off.top;

      $(document).mousemove(function (move_event) {
        // TODO prevent from going too far outside the map
        map.el.offset({
          left: down_map_x + (move_event.pageX - down_mouse_x), 
          top : down_map_y + (move_event.pageY - down_mouse_y) 
        });
        map.off = map.el.offset();
      });

      $(document).mouseup(function () {
        $(document).unbind('mousemove');
        map.off = map.el.offset();
        draw_map();
      });
    });

    // prevent default image drag in the browser
    $(document).bind('dragstart', function(e) {
      if(e.target.nodeName.toLowerCase() === 'img') {
        return false;
      }
    });

    $('#viewport').mousewheel(function (e, delta) {
      var half_w = viewport.geo.w / 2;
      var half_h = viewport.geo.h / 2;
      var cent_x = viewport.off.left + (viewport.geo.w / 2);
      var cent_y = viewport.off.top  + (viewport.geo.h / 2);
      var dist_x = map.off.left - cent_x;
      var dist_y = map.off.top  - cent_y;
      var canv_x = canvas_dims[zoom].w;
      var canv_y = canvas_dims[zoom].h;

      if((zoom > 1 && delta === -1) || (zoom < 4 && delta === 1)) {
        zoom += delta;
        $('#zoom').html(zoom);

        $('img:visible').each(function () {
          var self = $(this);

          self.hide();
          hidden[self.attr('id')] = true;
        });

        var new_dist_x = (dist_x * canvas_dims[zoom].w / canv_x) + half_w;
        var new_dist_y = (dist_y * canvas_dims[zoom].h / canv_y) + half_h;

        map.off = {
          left: viewport.off.left + new_dist_x,
          top : viewport.off.top  + new_dist_y
        }
        map.el.offset(map.off);

        draw_map();
      }

      return false;
    });
    
    // CHECKBOX HANDLER
    $('input').each(function () {
      $(this).removeAttr('checked');
    }).click(function () {
      var p = $(this).attr('data-period');
      var l = $(this).attr('data-layer');

      // if the layer not present yet
      if(!_.contains(current[p], l)) {
        current[p].push(l);
      }
      else {
        current[p] = _.without(current[p], l);
        $('img[data-pl="'+ p +'-'+ l +'"]').each(function () {
          var self = $(this);

          self.hide();
          hidden[self.attr('id')] = true;
        }); 
      }

      draw_map();
    });

    // start the app
    $('#zoom').html(zoom);
    $('#1906').find('.layer-box').trigger('click');

    function draw_map() {
      var x_off = Math.floor((viewport.off.left - map.off.left) / tile_size);
      var y_off = Math.floor((viewport.off.top  - map.off.top)  / tile_size);

      [0, 1, 2, 3, 4, 5, 6].forEach(function (ix) {
        [0, 1, 2, 3, 4].forEach(function (iy) {
          var x_tile = x_off + ix;
          var y_tile = y_off + iy;

          // prevent from showing tile outside the map
          if(x_tile * tile_size >= canvas_dims[zoom].w ||
             y_tile * tile_size >= canvas_dims[zoom].h ||
             x_tile < 0 || y_tile < 0) return;

          periods.forEach(function (period) {
            current[period].forEach(function (layer) {
              var img;
              var tile = [zoom, x_tile, y_tile, period, layer].join('_');
              var src  = './public/tiles/'+ tile +'.png';
             
              if(transparents[tile]) return;

              if(loaded[tile]) {
                if(hidden[tile]) {
                  $('#'+tile).show();
                  hidden[tile] = false;
                }
              }
              else {
                loaded[tile] = true;

                img = $('<img id="'+ tile +'" src="'+ src +'" data-pl="'+ period +'-'+ layer +'" data-period="'+ period +'" />');
                img.css({
                  left: (x_tile * 150)+'px', 
                  top: (y_tile * 150)+'px'
                });
                $('#'+layer).append(img);
              }
            });
          });
        });
      });

      $('input[data-type="opacity"]').each(function () {
        var period = $(this).attr('data-period');
        var value  = $(this).attr('checked') ? '0.7' : '1.0';

        $('img[data-period="'+ period +'"]').css('opacity', value);
      });

      $('.pin').remove();
      pins.forEach(function (pin, i) {
        var left = pin.x * zoom - 13;
        var top  = pin.y * zoom - 50;
        var marker = $('<img id="pin-'+ i +'" class="pin" src="./public/images/marker.png" style="position: absolute; top: '+ top +'px; left: '+ left +'px" />');

        marker.click(function (e) {
            console.log(pin.img);
            $(body).append('<img src="./public/images/'+ pin.img +'" />');
        });
        map.el.append(marker);
      });
    }
  });
})();



