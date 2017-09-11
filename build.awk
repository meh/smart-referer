#!/usr/bin/awk -f
BEGIN {
		# Add human-readable file header
		print "##################" > "whitelist.txt"
		print "# GENERATED FILE #" > "whitelist.txt"
		print "##################" > "whitelist.txt"
		print "# Full version available at: http://meh.schizofreni.co/smart-referer/whitelist.full.txt" > "whitelist.txt"
		print "" > "whitelist.txt"

        # Create output file
        ORS=" "
        while((getline < "whitelist.full.txt") > 0) {
                # Delete comments
                gsub(/#.+$/, "");

                # Remove double-spaces
                gsub(/\s+/, " ");

                # Remove whitespace on start and end
                gsub(/^\s+/, "");
                gsub(/\s+$/, "");

                # Print non-empty lines
                if(length($0) > 0) {
                        print $0 > "whitelist.txt";
                }
        }
}
