require '../lib/minify.rb'
require 'fileutils'

engine = ARGV[0]
engine ||= "regular";
# Compress JS

if(!%w(regular dev expanded preview).include?(engine))
  puts "Unknown environment. too bad."
  raise Exception.new()
end


def replace_in_file(file, pattern, replacement)
  updated_file = File.read(file).gsub(pattern, replacement)
  File.open(file,"w"){|f| f.write updated_file} 
end

# not now...

# Embed templates into main html
bin_laden = "../bin";

puts "Wrangling. First we version stuff"
old_ver = ""
new_ver = ""

File.open("version.txt", "r+") do |file|
  begin
    old_ver=file.read.strip()
    maj_version, min_version, rev = old_ver.split(".").map(&:to_i)
  rescue
    puts "Version number contains some bad shit. it should be [0-9]+.[0-9]+"
  end

  puts "Build marks revision change from #{rev} to #{rev+1}"
  new_ver="#{maj_version}.#{min_version}.#{rev+1}"
  file.rewind
  file.write(new_ver+(" "*10))
end
replace_in_file("builds/#{engine}_manifest.json", /\"version\"\:\s\"([0-9\.]+)\"/, "\"version\": \"#{new_ver}\"")
replace_in_file("javascripts/winston_host.js", /\[\"winston\_version\_number\"\]\=\"[0-9\.]+\"\;/, "[\"winston_version_number\"]=\"#{new_ver}\";")





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