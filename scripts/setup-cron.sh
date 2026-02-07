#!/bin/bash

# Setup cron job for VK auto-publish
# Run this script on the server to enable scheduled publishing

CRON_SECRET="${CRON_SECRET:-}"
SITE_URL="${SITE_URL:-https://baltland.ru}"

# Create cron job that runs every minute
CRON_CMD="* * * * * curl -s -H 'Authorization: Bearer ${CRON_SECRET}' '${SITE_URL}/api/cron/vk-auto-publish' >> /var/log/vk-auto-publish.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "vk-auto-publish"; then
    echo "Cron job already exists. Updating..."
    crontab -l | grep -v "vk-auto-publish" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "Cron job installed successfully!"
echo "The VK auto-publish will run every minute and check if it's time to publish."
echo ""
echo "To view logs: tail -f /var/log/vk-auto-publish.log"
echo "To remove: crontab -l | grep -v 'vk-auto-publish' | crontab -"
