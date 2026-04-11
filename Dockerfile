# escape=`

###
# Requirement: Docker Desktop > Settings > Docker Engine > add this at line 2 → "dns": ["1.1.1.1"],
###

# Use Windows Server Core 2019 image on Windows 10. On Windows 11, you can use Windows Server Core 2022 instead
FROM mcr.microsoft.com/windows/servercore:ltsc2019

# Use PowerShell as the default shell
SHELL ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

# Enable TLS 1.2
RUN [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Download VS Build Tools Installer
RUN Invoke-WebRequest https://aka.ms/vs/17/release/vs_BuildTools.exe -OutFile vs_buildtools.exe

# Install VS Build Tools
RUN Start-Process vs_buildtools.exe -ArgumentList `
    '--quiet --wait --norestart --nocache --installPath C:\BuildTools --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended' -Wait

# Remove VS Build Tools installer
RUN Remove-Item vs_buildtools.exe

# Install Node.js
RUN Invoke-WebRequest https://nodejs.org/dist/v24.9.0/node-v24.9.0-x64.msi -OutFile node.msi; `
    Start-Process msiexec.exe -ArgumentList '/i node.msi /quiet /norestart' -Wait; `
    Remove-Item node.msi

# Install Git
RUN Invoke-WebRequest https://github.com/git-for-windows/git/releases/download/v2.53.0.windows.2/Git-2.53.0.2-64-bit.exe -OutFile git.exe; `
    Start-Process git.exe -ArgumentList '/VERYSILENT /NORESTART' -Wait; `
    Remove-Item git.exe

# Install Python
RUN Invoke-WebRequest https://www.python.org/ftp/python/3.14.3/python-3.14.3-amd64.exe -OutFile python.exe; `
    Start-Process python.exe -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1' -Wait; `
    Remove-Item python.exe

# Add Git, Node.js and Python to PATH
ENV PATH="C:\\Program Files\\Git\\bin;C:\\Program Files\\Git\\usr\\bin;C:\\Program Files\\nodejs;C:\\Program Files\\Python314;C:\\Program Files\\Python314\\Scripts;${PATH}"

# Use Git Bash as default shell
SHELL ["\"C:\\Program Files\\Git\\bin\\bash.exe\"", "-lc"]

# Update NPM
RUN "npm install -g npm@11.12.0"

# Verify installation
RUN "node -v && npm -v && git --version && python --version && pip --version"

# Create and move to workspace directory
WORKDIR C:\workspace\actionify

# Copy project files
COPY . .

# Install dependencies
RUN "npm ci"

# Build project
RUN "npm run build"

# Open shell in container
CMD ["bash"]
