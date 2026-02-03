import pexpect
import sys

SERVER_IP = "85.198.85.239"
SERVER_PASSWORD = r"%GJZ)z6zc5Jz"

# -v for verbose to see debug info
cmd = f"ssh -v -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@{SERVER_IP} 'uptime'"

print(f"Running diagnostic: {cmd}")
child = pexpect.spawn(cmd, timeout=30)
child.logfile = sys.stdout.buffer

try:
    index = child.expect([
        "[Pp]assword:", 
        "Permission denied",
        "Connection closed",
        pexpect.EOF,
        pexpect.TIMEOUT
    ])

    if index == 0:
        print("\n--- Sending Password ---")
        child.sendline(SERVER_PASSWORD)
        
        # Expect response after password
        index2 = child.expect([
            "uptime", # Success (uptime command output usually contains 'load average')
            "load average",
            "Permission denied",
            "Connection closed",
            pexpect.EOF,
            pexpect.TIMEOUT
        ])
        
        if index2 == 0 or index2 == 1:
            print("\nSUCCESS: Login successful!")
        elif index2 == 2:
            print("\nFAILURE: Password rejected (Permission denied).")
        elif index2 == 3:
            print("\nFAILURE: Connection closed immediately after password.")
        else:
            print(f"\nFAILURE: Unexpected response index {index2}")
            
    elif index == 1:
        print("\nFAILURE: Permission denied before password prompt (Key based auth only?)")
    elif index == 2:
        print("\nFAILURE: Connection closed before password prompt.")
    elif index == 3:
        print("\nFAILURE: EOF encountered unexpectedly.")
    elif index == 4:
        print("\nFAILURE: Timeout waiting for prompt.")

except Exception as e:
    print(f"\nERROR: {e}")

child.close()
