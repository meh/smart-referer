# Once we migrate to WebExtensions for good, this can probably be replaced by the `web-ext` tool…


# Name of target file is based on version number
DISTFILE := smart-referer.xpi


# Don't print *everything* to terminal
.SILENT:

# Default target
.PHONY: all
all: xpi

# Target from creating a read-to-ship XPI
.PHONY: xpi
xpi: ${DISTFILE}


.PHONY .ONESHELL: ${DISTFILE}
${DISTFILE}:
	######################
	# Assemble file list #
	######################
	# Only consider currently tracked GIT files
	filelist="$$(git ls-files | grep -v '^[.]')"
	# Skip build system files
	filelist="$$(echo "$${filelist}" | grep -vx 'Makefile')"
	# Only include the pre-assembled, non-minimized distribution file of the PSL
	filelist="$$(echo "$${filelist}" | grep -v '^webextension/deps/public-suffix-list') webextension/deps/public-suffix-list/dist/psl.js"
	
	##########################
	# Build target .XPI file #
	##########################
	rm "${DISTFILE}" 2>/dev/null ||:
	zip -9 "${DISTFILE}" $${filelist}

# Target for making a new GIT release (and building an XPI for it)
.PHONY .ONESHELL: release
release: ${DISTFILE}
	############################
	# Determine target version #
	############################
	version="$$(grep '<em:version>.*</em:version>' "install.rdf" | cut -d'>' -f2 | cut -d'<' -f 1)"
	
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
