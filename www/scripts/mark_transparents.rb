require 'json'
require 'RMagick'

transparents = Hash.new

Dir.chdir "../public/tiles"
Dir["*png"].each do |fname|
  img = Magick::Image.read(fname).first

  opaque = true
  (0..img.rows).each do |x|
    (0..img.columns).each do |y|
      pix = img.pixel_color x, y
      opaque = false unless pix.to_hsla.pop == 0.0
    end
    break unless opaque
  end

  if opaque
    File.delete fname
    tile = fname.sub ".png", ""
    transparents[tile] = true
  end
end

File.open('../../public/javascript/transparents.json', 'w') do |f|
  f.write JSON.dump transparents  
end
