visited_tiles = []

Dir.chdir "../public/tiles"
["70", "1906", "wielkie", "wspolczesna"].each do |map|
  Dir["*#{map}*"].each do |fname|
    tile = fname.rpartition(/_/).first

    unless visited_tiles.include? tile
      # merge selected layers
      system "convert -background \"none\" #{tile}_zielen.png #{tile}_woda.png -flatten png32:#{tile}_przyroda.png"
      system "convert -background \"none\" #{tile}_ulice.png  #{tile}_tory.png -flatten png32:#{tile}_drogi.png"

      # clean up 
      ["zielen", "woda", "ulice", "tory"].each do |layer|
        File.delete "#{tile}_#{layer}.png"
      end

      # mark this tile as seen
      visited_tiles << tile
    end
  end
end


