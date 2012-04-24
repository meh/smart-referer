require 'rake'
require 'rake/clean'

CLEAN.include('*.xpi')

task :default do
  sh %{zip -9r \\
    smart-referer-#{File.read('install.rdf').match(%r{<em:version>(.*?)</em:version>})[1]}.xpi \\
    install.rdf bootstrap.js
  }
end
