require 'nokogiri'


SQUARE = 150

WIDTH  = 900
HEIGHT = 1000
# where you can spot designer's mistakes
MARGIN = 1580

VIEWPORT_W  = 920
VIEWPORT_H  = 560
ZOOM_LEVELS = 4

TMP_PATH   = './tmp'
SVG_PATH   = './svg'
TILES_PATH = '../public/tiles'

if Dir.exists? TMP_PATH
  Dir["#{TMP_PATH}/*"].each {|fname| File.delete fname }
else
  Dir.mkdir TMP_PATH  
end

if Dir.exists? TILES_PATH
  Dir["#{TILES_PATH}/*"].each {|fname| File.delete fname }
else
  Dir.mkdir TILES_PATH  
end


["70", "1906", "wielkie", "wspolczesna"].each {|map|
  ["ulice", "zabudowa", "woda", "zielen", "tory"].each {|layer| 
    fname = "#{map}_#{layer}"
    svg = Nokogiri::XML File.open "#{SVG_PATH}/#{fname}.svg"

    # remove potential background layer
    layers = svg.root.children.select {|el| el.name == 'g'}
    layers[1].remove if layers.length == 3

    # make a background layer transparent to keep geometry
    svg.css('#TLO').first.children.each {|el|
      el.set_attribute "fill-opacity", "0.0"
    } if svg.css("#TLO").any?

    # remove unwanted root attributes
    ["viewBox", "enable-background"].each {|attr|
      svg.remove_attribute attr
    }

    # repair designer's mistake...
    svg.css('polygon').each {|p|
      p.remove if p.attribute('points').value.split(',').first.to_f > MARGIN
    }
    svg.css('rect').each {|r|
      r.remove if r.attribute('x').value.to_f > MARGIN
    }

    # save temporarily transformed svg file
    tmp_svg = "#{TMP_PATH}/#{fname}.svg"
    File.open(tmp_svg, 'w') {|f| f.write svg.to_s }

    # --> ZOOM 1..
    (1..ZOOM_LEVELS).each {|level|
      tmp_png = "#{TMP_PATH}/#{level}_#{fname}.png"
      w =       WIDTH  * level
      h =       HEIGHT * level
      hor =     w / SQUARE
      ver =     h / SQUARE

      # resize svg and export it to png bitmap
      system "inkscape -D -y=0 -e=#{tmp_png} -w=#{w} -h=#{h} #{tmp_svg}"

      # create tiles
      hor.times {|x|
        ver.times {|y|
          area = "#{SQUARE}x#{SQUARE}+#{x*SQUARE}+#{y*SQUARE}"
          path = "#{TILES_PATH}/#{level}_#{x}_#{y}_#{fname}.png"

          system "convert #{tmp_png} -crop #{area}\\! png32:#{path}"
        }
      }
    }
  }
}

# be kind, clean up
Dir["#{TMP_PATH}/*"].each {|fname| File.delete fname }
Dir.delete TMP_PATH
