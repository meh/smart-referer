#!/usr/bin/awk -f
BEGIN {
		# Add human-readable file header
		print "##################" > "whitelist.min.txt"
		print "# GENERATED FILE #" > "whitelist.min.txt"
		print "##################" > "whitelist.min.txt"
		print "# Full version available at: https://raw.githubusercontent.com/meh/smart-referer/gh-pages/whitelist.txt" > "whitelist.min.txt"
		print "" > "whitelist.min.txt"

        # Create output file
        ORS=" "
        while((getline < "whitelist.txt") > 0) {
                # Delete comments
                gsub(/#.+$/, "");

                # Remove double-spaces
                gsub(/\s+/, " ");

                # Remove whitespace on start and end
                gsub(/^\s+/, "");
                gsub(/\s+$/, "");

                # Print non-empty lines
                if(length($0) > 0) {
                        print $0 > "whitelist.min.txt";
                }
        }
}
