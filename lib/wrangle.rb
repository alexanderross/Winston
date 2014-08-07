require '../lib/minify.rb'
require 'fileutils'

engine = ARGV[0]
engine ||= "regular";
# Compress JS

if(!%w(regular dev expanded preview).include?(engine))
  puts "Unknown environment. too bad."
  raise Exception.new()
end


# not now...

# Embed templates into main html
bin_laden = "../bin";

puts "Wrangling."


hub_file = if(engine == "preview")
  File.open("templates/winston.html", "w+");
else
  File.open("#{bin_laden}/winston.html", "w+");
end

puts "Packing Extension default data"

if(engine == "expanded" || engine == "regular")
  puts "Minifying JS footprints, you need an internet connection for this."
  minify_js("javascripts/winject.js","../bin/winject.js")
  minify_js("javascripts/winston_host.js","../bin/winston_host.js")
  minify_js("javascripts/winston_option.js", "../bin/winston_option.js")
else
  puts "Copying JS into bin"
  FileUtils.cp("javascripts/winject.js","../bin/winject.js")
  FileUtils.cp("javascripts/winston_host.js","../bin/winston_host.js")
  FileUtils.cp("javascripts/winston_option.js", "../bin/winston_option.js")
end
FileUtils.cp("javascripts/jquery.js","../bin/jquery.js")


dirpath = "templates/js_data"
puts Dir.entries(dirpath)
Dir.entries(dirpath).each do |file|
  next if file[0] == "."
  hub_file.write("<script type='text/javascript'>")
  hub_file.write(File.open(File.join([dirpath,file])).read())
  hub_file.write("</script>\n")
end

puts "Packing Main base driver"
hub_file.write("<script src='winston_host.js'></script>");

puts "transferring Style"
FileUtils.cp("templates/html_templates/style/winston.css","../bin/winston.css")



dirpath = "templates/html_templates/export"
Dir.entries(dirpath).each do |file|
  next if file[0] == "."
  hub_file.write("<div id='template_#{file}'>")
  hub_file.write(File.open(File.join([dirpath,file,"winston.html"])).read())
  hub_file.write("</div>\n")
end

puts "Done packing"