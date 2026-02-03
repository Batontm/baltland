import pexpect
import sys
import os

SERVER_IP = "85.198.85.239"
SERVER_PASSWORD = r"uVma7Ek!(J5F"

def run_command(cmd, timeout=300):
    print(f"Running: {cmd}")
    child = pexpect.spawn(cmd, timeout=timeout)
    
    # Handle possible SSH prompts
    while True:
        index = child.expect([
            "password:", 
            "Are you sure you want to continue connecting",
            pexpect.EOF,
            pexpect.TIMEOUT
        ])
        
        if index == 0:  # password prompt
            print("Sending password...")
            child.sendline(SERVER_PASSWORD)
        elif index == 1:  # fingerprint prompt
            print("Accepting fingerprint...")
            child.sendline("yes")
        elif index == 2:  # EOF (command finished)
            break
        elif index == 3:  # Timeout
            print("Timeout encountered!")
            print(child.before.decode('utf-8', errors='ignore'))
            break
            
    print(child.before.decode('utf-8', errors='ignore'))
    child.close()
    return child.exitstatus

print("Starting automated deployment...")

# Make deploy script executable
os.chmod("scripts/deploy.sh", 0o755)

# Run the deploy script
# Note: The deploy script itself calls ssh/scp multiple times. 
# It's better to execute the deploy script logic directly via python or 
# wrap the whole execution. 
# However, deploy.sh calls ssh multiple times, so pexpecting just './scripts/deploy.sh'
# means we have to handle potentially multiple password prompts in a row.

child = pexpect.spawn("./scripts/deploy.sh", timeout=600)
# Log output to stdout
child.logfile = sys.stdout.buffer

while True:
    try:
        index = child.expect([
            "[Pp]assword:", 
            "Are you sure you want to continue connecting",
            pexpect.EOF,
            pexpect.TIMEOUT
        ])
        
        if index == 0:
            # We see a password prompt from one of the ssh/scp commands inside the script
            child.sendline(SERVER_PASSWORD)
        elif index == 1:
            child.sendline("yes")
        elif index == 2:
            break
        elif index == 3:
            print("Timeout waiting for output...")
            break
    except Exception as e:
        print(f"Error: {e}")
        break

print("Deployment wrapper finished.")
