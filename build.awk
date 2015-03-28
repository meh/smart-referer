#!/usr/bin/awk -f
BEGIN {
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
