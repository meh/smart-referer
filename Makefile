# Eventually this will be completely replaced by the `web-ext` tool after
# issue https://github.com/mozilla/web-ext/issues/940 has been implemented…


# Name of target file is based on version number
DISTFILE := web-ext-artifacts/smart-referer.xpi

# Assemble list of files that will be included in the final archive
#  ~ Only consider currently tracked GIT files
FILELIST := $(shell git ls-files)
#  ~ Skip ALL hidden files
FILELIST := $(filter-out .%,            ${FILELIST})
#  ~ Skip screenshots
FILELIST := $(filter-out screenshots/%, ${FILELIST})
#  ~ Skip build system files
FILELIST := $(filter-out Makefile,      ${FILELIST})
#  ~ Only include the pre-assembled, non-minimized distribution file of the PSL
FILELIST := $(filter-out deps/public-suffix-list%, ${FILELIST}) deps/public-suffix-list/dist/psl.js
#  ~ Include `wext-options` files
FILELIST := ${FILELIST} deps/wext-options/options.css deps/wext-options/options.js



# Default target
.PHONY: all
all: xpi

# Target from creating a read-to-ship XPI
.PHONY: xpi
xpi: ${DISTFILE}

${DISTFILE}: ${FILELIST}
	rm "${DISTFILE}" 2>/dev/null ||:
	mkdir -p "$(dir ${DISTFILE})"
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
	version="$$(grep --only-matching '"version":\s*".*"' "manifest.json" | cut -d'"' -f4)"
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
		echo 'Release $${version} already exists, please increment the version number in the "manifest.json" file' >&2
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
	git tag --sign -m "Version $${version}" "v$${version}"
	
	#########################
	# Archive the final XPI #
	#########################
	cp "${DISTFILE}" "$(dir ${DISTFILE})$(notdir $(basename ${DISTFILE}))-$${version}$(suffix ${DISTFILE})"


.PHONY: run
run:
	web-ext run ${WEXTARGS}
