#!/bin/bash
DUMP_FILE="/Users/lexa/Documents/Python/rkkland/dump.sql"

# List of cadastral numbers to fix
declare -a cns=(
"39:03:090805:371" "39:05:030506:230" "39:03:060008:495" "39:03:090805:373" "39:08:380003:2"
"39:05:030506:83" "39:02:240005:577" "39:02:240005:582" "39:03:060208:252" "39:05:030506:75"
"39:05:030506:92" "39:03:060008:744" "39:05:030506:164" "39:02:240005:576" "39:03:060208:247"
"39:05:030506:65" "39:03:060208:248" "39:02:240005:676" "39:03:060208:253" "39:03:060008:747"
"39:03:060008:746" "39:03:060208:239" "39:05:030506:82" "39:02:240005:677" "39:03:060208:235"
"39:03:060008:745" "39:03:080702:437" "39:03:060208:246" "39:03:080814:4301" "39:03:040030:733"
"39:02:080001:164" "39:03:060208:249" "39:05:030506:269" "39:03:060008:496" "39:03:090805:372"
"39:03:060208:245" "39:05:030506:64" "39:03:060008:743" "39:05:030506:163"
)

# Extract settlements map
sed -n '/COPY public\.settlements/,/\\\./p' "$DUMP_FILE" | grep -v "COPY" | grep -v "\\\." > settlements.tmp

# Extract listings map
sed -n '/COPY public\.listings/,/\\\./p' "$DUMP_FILE" | grep -v "COPY" | grep -v "\\\." > listings.tmp

echo "Cadastral Number | Settlement Name"
echo "-----------------------------------"

for cn in "${cns[@]}"; do
    # Find plot in dump
    plot_line=$(grep "$cn" "$DUMP_FILE" | head -n 1)
    if [ -n "$plot_line" ]; then
        listing_id=$(echo "$plot_line" | awk '{print $2}')
        # Find listing to get settlement_id
        settlement_id=$(grep "^$listing_id[[:space:]]" listings.tmp | awk '{print $9}')
        if [ -n "$settlement_id" ] && [ "$settlement_id" != "\\N" ]; then
            # Find settlement name
            s_name=$(grep "^$settlement_id[[:space:]]" settlements.tmp | awk -F'\t' '{print $3}')
            echo "$cn | $s_name"
        else
            echo "$cn | NOT FOUND (Listing $listing_id)"
        fi
    else
        echo "$cn | NOT FOUND in dump"
    fi
done

rm settlements.tmp listings.tmp
