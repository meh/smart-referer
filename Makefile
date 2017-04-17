# Once we migrate to WebExtensions for good, this can probably be replaced by the `web-ext` tool…


# Name of target file is based on version number
DISTFILE := smart-referer.xpi

# Assemble list of files that will be included in the final archive
#  ~ Only consider currently tracked GIT files
FILELIST := $(shell git ls-files)
#  ~ Skip ALL hidden files
FILELIST := $(filter-out .%,       ${FILELIST})
#  ~ Skip build system files
FILELIST := $(filter-out Makefile, ${FILELIST})
#  ~ Only include the pre-assembled, non-minimized distribution file of the PSL
FILELIST := $(filter-out webextension/deps/public-suffix-list%, ${FILELIST}) webextension/deps/public-suffix-list/dist/psl.js



# Default target
.PHONY: all
all: xpi

# Target from creating a read-to-ship XPI
.PHONY: xpi
xpi: ${DISTFILE}

${DISTFILE}: ${FILELIST}
	rm "${DISTFILE}" 2>/dev/null ||:
	zip -9 "${DISTFILE}" ${FILELIST}

# Target for making a new GIT release (and building an XPI for it)
.PHONY .ONESHELL .SILENT: release
release: ${DISTFILE}
	##########################
	# Sanity check for macOS #
	##########################
	_dummy_value_check=x
	test -n "$${_dummy_value_check}" || echo "make .ONESHELL command not supported, please use GNU Make 4.0+!" >&2
	
	############################
	# Determine target version #
	############################
	version="$$(grep '<em:version>.*</em:version>' "install.rdf" | cut -d'>' -f2 | cut -d'<' -f 1)"
	if [ -z "$${version}" ];
	then
		echo 'Could not detect the current version number' >&2
		exit 1
	fi
	
	######################################
	# Make sure version number is unique #
	######################################
	if git show-ref "v$${version}" >/dev/null;
	then
		echo 'Release $${version} already exists, please increment the version number in the "install.rdf" file' >&2
		exit 2
	fi
	
	###########################################
	# Make sure everything has been committed #
	###########################################
	if [ -n "$$(git status --short)" ];
	then
		echo 'There are uncommitted files in your repository, please commit or stash them before continuing' >&2
		exit 3
	fi
	
	#################################
	# Tag the newly created version #
	#################################
	git tag "v$${version}"
	
	#########################
	# Archive the final XPI #
	#########################
	cp "${DISTFILE}" "smart-referer-$${version}.xpi"

# Technically JPM is only for Jetpack-based add-ons, but it has enough compatibility hacks to work
# with out bootstrapped extension just fine
.PHONY: run
run:
	jpm --binary $$(which firefox) ${JPMARGS} run
