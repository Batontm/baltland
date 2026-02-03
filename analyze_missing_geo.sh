#!/bin/bash
DUMP_FILE="/Users/lexa/Documents/Python/rkkland/dump.sql"
OUTPUT_FILE="dump_check_results.txt"

declare -a cns=(
"39:03:060007:602" "39:05:061115:314" "39:03:060007:1522" "39:03:080814:4363" "39:03:060007:1527"
"39:03:060007:1521" "39:03:080704:201" "39:03:091007:862" "39:03:080704:213" "39:11:091011:217"
"39:11:091011:216" "39:11:091011:218" "39:08:340002:413" "39:03:060007:1526" "39:03:080809:121"
"39:03:060012:2067" "39:03:080202:98" "39:08:340002:418" "39:08:340002:415" "39:03:040011:823"
"39:08:340002:420" "39:03:060018:447" "39:03:090801:2061" "39:08:340002:417" "39:11:060033:215"
"39:22:080002:1054" "39:03:040036:328" "39:03:080808:499" "39:03:060011:87" "39:11:091011:219"
"39:08:340002:419" "39:03:040036:331"
)

echo "Cadastral Number | Found in Dump | Address in Dump | Price in Dump" > "$OUTPUT_FILE"
echo "----------------------------------------------------------------------" >> "$OUTPUT_FILE"

for cn in "${cns[@]}"; do
    line=$(grep -m 1 "$cn" "$DUMP_FILE")
    if [ -n "$line" ]; then
        # Handle different potential table formats in dump
        # If it's the plots table (usually cadastral number is 3rd or 4th column)
        # 1-id, 2-listing_id, 3-cadastral_number, 4-land_use_id, 5-land_category_id, 6-area, 7-address, 10-price_public
        # Let's try to extract common fields
        address=$(echo "$line" | awk -F'\t' '{print $7}')
        price=$(echo "$line" | awk -F'\t' '{print $10}')
        echo "$cn | YES | $address | $price" >> "$OUTPUT_FILE"
    else
        echo "$cn | NO | - | -" >> "$OUTPUT_FILE"
    fi
done

cat "$OUTPUT_FILE"
rm "$OUTPUT_FILE"
