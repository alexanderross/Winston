require '../lib/minify.rb'
require 'fileutils'

engine = ARGV[0]
engine ||= "regular"
# Compress JS

bin_laden = "../bin"

if(!%w(regular dev expanded preview).include?(engine))
  puts "Unknown environment. too bad."
  raise Exception.new()
end


def replace_in_file(file, pattern, replacement)
  updated_file = File.read(file).gsub(pattern, replacement)
  File.open(file,"w"){|f| f.write updated_file} 
end

def copy_to_bin(files)
  files.each do |f|
    FileUtils.cp(f, "../bin/"+f.split("/").last)
  end
end

#Take in a manifest, spit out file names in order to be loaded
def files_for_manifested_dir(dir)
  files = []
  begin
    manfile = File.open(File.join(dir,"import_manifest"), "r")
  rescue
    raise Exception.new("import manifest not found for #{dir}")
  end

  manfile.each_line do |l|
    line = l.strip()
    next if line[0] == "#"
    next if line == ""

    files << line
  end

  files
end

def process_host_pack
  bin_laden = "../bin"
  pack_path = "templates/js/host_pack"
  files = files_for_manifested_dir(pack_path)
  dirpath = "templates/html_templates/export"
  host_file = File.open("#{bin_laden}/winston.html", "w+")

  files.each do |f|
    host_file.write("\n<script type='text/javascript' src='#{f}'></script>\n")
    FileUtils.cp(File.join([pack_path,f]), "../bin/"+f.split("/").last)
    #host_file.write("\n</script>\n")
  end

  Dir.entries(dirpath).each do |file|
    next if file[0] == "."
    host_file.write("\n<div id='template_#{file}'>\n")
    host_file.write(File.open(File.join([dirpath,file,"winston.html"])).read())
    host_file.write("\n</div>\n")
  end
  host_file.close

end

def process_inject_pack(engine)
  files = files_for_manifested_dir("templates/js/injection_pack")
  copy_to_bin(files.map{|fn| "templates/js/injection_pack/#{fn}"})

  replace_in_file("builds/#{engine}_manifest.json", /\"js\":\s+\[.+\]/, "\"js\": [\"#{files.join("\",\"")}\"]")
end

def process_options_pack
  bin_laden = "../bin"
  pack_path = "templates/js/options_pack"
  files = files_for_manifested_dir(pack_path)
  opt_path = "#{bin_laden}/winston_cfg.html"

  opt_content = File.open(opt_path, "r").read
  opt_file = File.open(opt_path, "w+")
  files.each do |f|
    opt_file.write("\n<script type='text/javascript' src='#{f}'></script>\n")
    FileUtils.cp(File.join([pack_path,f]), "../bin/"+f.split("/").last)
    opt_file.write("\n</script>\n")
  end
  opt_file.write(opt_content)
  opt_file.close

end

# not now...

# Embed templates into main html

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
replace_in_file("templates/js/host_pack/winston_host.js", /\[\"winston\_version\_number\"\]\=\"[0-9\.]+\"\;/, "[\"winston_version_number\"]=\"#{new_ver}\";")

process_host_pack
process_options_pack
process_inject_pack(engine)



# Injection pack -> modify manifest to reflect contents. Shove into bin. Can minify


puts "transferring Style"
FileUtils.cp("templates/html_templates/style/winston.css","../bin/winston.css")


puts "Done packing"