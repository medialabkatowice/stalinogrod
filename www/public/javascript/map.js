;(function () {
  $.getJSON('./public/javascript/transparents.json', function (transparents) {
  
    // pins
    var pins = [{
        x: 300, 
        y: 300,
        img: '001.jpg',
        title: 'Janek lubi czarne jagody i różnowy boczek',
        link: 'x'
    }, {
        x: 350, 
        y: 325,
        img: '002.png',
        title: 'Janek lubi czarne jagody',
    }, {
        x: 599, 
        y: 465,
        img: '003.jpg',
        title: 'Janek lubi czarne jagody',
        link: 'x'
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
      var target_class = down_event.target.getAttribute('class');
      if(target_class === 'pin') {
          $(down_event.target).trigger('click');
          return false;
      }
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

    // TODO buttons disapear after zooming
    $('.zoom').click(function (e) {
      var half_w = viewport.geo.w / 2;
      var half_h = viewport.geo.h / 2;
      var cent_x = viewport.off.left + (viewport.geo.w / 2);
      var cent_y = viewport.off.top  + (viewport.geo.h / 2);
      var dist_x = map.off.left - cent_x;
      var dist_y = map.off.top  - cent_y;
      var canv_x = canvas_dims[zoom].w;
      var canv_y = canvas_dims[zoom].h;
      var delta  = $(this).attr('id') === 'zoom_in' ? 1 : -1;

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

      $('.zoom').css('cursor', 'pointer');

      if(zoom === 4) {
        $('#zoom_in').css('cursor', 'default');
      }
      if(zoom === 1) {
        $('#zoom_out').css('cursor', 'default');
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

    function add_pins() {
        $('.pin').remove();
        pins.forEach(function (pin, i) {
            var left = pin.x * zoom - 16;
            var top  = pin.y * zoom - 13;
            var marker = $('<img id="pin-'+ i +'" class="pin" src="./public/images/marker.png" style="top: '+ top +'px; left: '+ left +'px" />');

            $('#zdjecia').append(marker);
            marker.click(function (e) {
                var img = new Image();
                img.onload = function() {
                    var x_ratio = 500 / this.width;
                    var y_ratio = 400 / this.height;
                    var ratio   = x_ratio < y_ratio ? x_ratio : y_ratio;

                    this.width  *= ratio < 1.0 ? ratio : 1;
                    this.height *= ratio < 1.0 ? ratio : 1;

                    this.style.position = 'relative';

                    $('#lightbox')
                        .empty()
                        .css({
                            // this "- 30" stands for the padding
                            'left'      : (viewport.geo.w - this.width)  / 2 - 30,
                            'top'       : viewport.geo.h * 0.05,
                            'width'     : this.width,
                            'min-height': this.height
                        })        
                        .append('<img src="./public/images/close.png" id="close" />')
                        .append('<p id="title">'+ pin.title +'</p>')
                        .append(this)
                        .append(pin.link ? '<br /><p class="more"><a href="'+ pin.link +'">Przeczytaj artykuł o tym budynku »</a></p>' : '')
                        .show()
                        .click(function () {
                            $(this).empty().hide();
                        });
                }
                img.src = './public/images/' + pin.img;
            });
        });
    }

//    $('#pin-2').click();
    
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
      add_pins();
      $('.zoom').show();
    }
  });
})();



