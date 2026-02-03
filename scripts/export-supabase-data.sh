#!/bin/bash

# Export all tables from Supabase Cloud via REST API
# Usage: ./scripts/export-supabase-data.sh

SUPABASE_URL="https://tucmqwynsjgprgwbvhbz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Y21xd3luc2pncHJnd2J2aGJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTUxNjgsImV4cCI6MjA4MDg3MTE2OH0.Owmg8c_BR7QtuLDf5mFbryvYkYypl3sTvcuu1L6Rat4"
BACKUP_DIR="backup_data"

mkdir -p "$BACKUP_DIR"

TABLES=(
  "land_plots"
  "land_plot_images"
  "organization_settings"
  "leads"
  "subscribers"
  "news"
  "commercial_proposals"
  "commercial_proposal_plots"
  "landing_benefits_section"
  "landing_benefit_items"
  "settlement_descriptions"
  "faq_items"
  "legal_content"
  "chat_sessions"
  "chat_messages"
  "admin_users"
  "users"
  "import_logs"
  "kladr_places"
  "kladr_streets"
  "plot_placeholders"
  "rate_limit_events"
)

export_table() {
  local table=$1
  local offset=0
  local limit=1000
  local total=0
  local file="$BACKUP_DIR/${table}.json"
  
  echo -n "Exporting $table... "
  
  # Get total count
  count_header=$(curl -s -I "$SUPABASE_URL/rest/v1/$table?select=*" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Prefer: count=exact" 2>/dev/null | grep -i "content-range" | tr -d '\r')
  
  if [[ $count_header =~ /([0-9]+)$ ]]; then
    total=${BASH_REMATCH[1]}
  fi
  
  if [ "$total" -eq 0 ]; then
    echo "[]" > "$file"
    echo "0 rows"
    return
  fi
  
  # Export all rows with pagination
  echo "[" > "$file"
  local first=true
  
  while [ $offset -lt $total ]; do
    local end=$((offset + limit - 1))
    
    data=$(curl -s "$SUPABASE_URL/rest/v1/$table?select=*&order=id" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Range: $offset-$end" 2>/dev/null)
    
    # Remove [ and ] from array and append
    data_inner=$(echo "$data" | sed 's/^\[//;s/\]$//')
    
    if [ -n "$data_inner" ] && [ "$data_inner" != "null" ]; then
      if [ "$first" = true ]; then
        first=false
      else
        echo "," >> "$file"
      fi
      echo "$data_inner" >> "$file"
    fi
    
    offset=$((offset + limit))
  done
  
  echo "]" >> "$file"
  echo "$total rows"
}

echo "=== Supabase Data Export ==="
echo "Exporting to: $BACKUP_DIR/"
echo ""

for table in "${TABLES[@]}"; do
  export_table "$table"
done

echo ""
echo "=== Export Complete ==="
ls -lh "$BACKUP_DIR"/*.json 2>/dev/null | awk '{print $9, $5}'
