Install-Module -Name WinSCP

$username = "baremedia.com.au"
$privateKeyPath = "D:\Github\1-cursor\toolkit\powershell\sftp\private.ppk"
$localPath = "D:\Github\1-cursor\toolkit\powershell\sftp\downloads"

# Either create credential object or use Get-Credential to prompt for password if needed
$credential = New-Object System.Management.Automation.PSCredential($username, (New-Object System.Security.SecureString))

# Get the host key fingerprint using SHA-256 (preferred nowadays)
# $fingerprint = Get-WinSCPHostKeyFingerprint -SessionOption (New-WinSCPSessionOption -HostName "sftp-cloud.mynrma.com.au" -SshHostKeyPolicy "AcceptNew") -Algorithm SHA-256
# Write-Host "The fingerprint is: $fingerprint"

# Then use that fingerprint in your actual connection
$sessionOption = New-WinSCPSessionOption `
    -HostName "sftp-cloud.mynrma.com.au" `
    -SshPrivateKeyPath $privateKeyPath `
    -Credential $credential `
    -SshHostKeyFingerprint "ssh-rsa 2048 QyUlNSkDDEzzKNyz5xw7k21kHDhYcGeafyaV+slaTZ0" # Replace with the fingerprint from above

$session = New-WinSCPSession -SessionOption $sessionOption

# List remote directory of session
# Get-WinSCPChildItem -WinSCPSession $session -Path "./" is the same as Get-WinSCPChildItem -WinSCPSession $session -Path "/partners/baremedia.com.au"
# Get-WinSCPChildItem -WinSCPSession $session -Path "/partners"
# Get-WinSCPChildItem -WinSCPSession $session -Path "/partners/baremedia.com.au"

# New-WinSCPItem -Path "./test.txt" -Value "Hello NRMA"

# Download file from remote directory
# Receive-WinSCPItem -WinSCPSession $session -Path "/home/user/file.txt" -Destination "C:\download\"

# Sync all files from remote directories, delete if download is successful
$localPath = "D:\Github\1-cursor\toolkit\powershell\sftp\downloads"
$sync = Sync-WinSCPPath -WinSCPSession $session -Mode Local -RemotePath "./OUT" -LocalPath $localPath
if ($sync.IsSuccess) {
    Remove-WinSCPItem -Path "./OUT/*" -Confirm:$false
}

# Remove the WinSCPSession after completion.
Remove-WinSCPSession -WinSCPSession $session