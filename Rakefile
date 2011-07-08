require 'rake'
require 'rake/clean'

CLEAN.include('smart-referer.xpi')

task :default do
  sh 'zip -9r smart-referer.xpi install.rdf chrome.manifest components'
end
