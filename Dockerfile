# escape=`

###
# Requirement: Docker Desktop > Settings > Docker Engine > add this at line 2 → "dns": ["1.1.1.1"],
###

FROM mcr.microsoft.com/windows/servercore:ltsc2025

################################
## Install build dependencies ##
################################

# Use PowerShell as the default shell
SHELL ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

# Enable TLS 1.2
RUN [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Download VS Build Tools 2022 Installer
RUN Invoke-WebRequest https://aka.ms/vs/17/release/vs_BuildTools.exe -OutFile vs_buildtools.exe

# Install VS Build Tools
RUN Start-Process vs_buildtools.exe -ArgumentList `
    '--quiet --wait --norestart --nocache --installPath C:\BuildTools --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended' -Wait
# Note: --includeRecommended car be replaced as of 2026-07-05 with:
#           --add Microsoft.VisualStudio.Component.TestTools.BuildTools
#           --add Microsoft.VisualStudio.Component.VC.ASAN
#           --add Microsoft.VisualStudio.Component.VC.CMake.Project
#           --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64
#           --add Microsoft.VisualStudio.Component.Vcpkg
#           --add Microsoft.VisualStudio.Component.Windows11SDK.26100
# See full list here: https://learn.microsoft.com/is-is/%20%20visualstudio/install/workload-component-id-vs-build-tools?view=vs-2022#desktop-development-with-c

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

# Add Windows executables to PATH
ENV PATH="C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0;${PATH}"

# Use Git Bash as default shell
SHELL ["\"C:\\Program Files\\Git\\bin\\bash.exe\"", "-lc"]

# Update NPM
RUN "npm install -g npm@11.18.0"

# Verify installation
RUN "node -v && npm -v && git --version && python --version && pip --version"

# Create and move to workspace directory
WORKDIR C:\workspace\actionify

##############################
## Install C++ dependencies ##
##############################

# Create project library dependencies folder
RUN "mkdir -p ./deps/windows/lib/"

# Create project header dependencies folder
RUN "mkdir -p ./deps/windows/include/"

#####################
# Install tesseract #
#####################

# Create tesseract temporary build folder
RUN "mkdir -p /tmp/tesseract-build/"

# Download vcpkg
RUN "git clone --branch 2026.06.24 --single-branch https://github.com/microsoft/vcpkg /tmp/tesseract-build/vcpkg"

# Bootstrap vcpkg
RUN "/tmp/tesseract-build/vcpkg/bootstrap-vcpkg.sh"

# Install tesseract and its dependencies
RUN "/tmp/tesseract-build/vcpkg/vcpkg install tesseract:x64-windows-static"

# Copy tesseract binaries in project folder
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/tesseract55.lib ./deps/windows/lib/tesseract.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/archive.lib ./deps/windows/lib/archive.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/bz2.lib ./deps/windows/lib/bz2.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/lz4.lib ./deps/windows/lib/lz4.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/zstd.lib ./deps/windows/lib/zstd.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/libcurl.lib ./deps/windows/lib/curl.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/leptonica-1.87.0.lib ./deps/windows/lib/leptonica.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/libpng16.lib ./deps/windows/lib/png.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/jpeg.lib ./deps/windows/lib/jpeg.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/tiff.lib ./deps/windows/lib/tiff.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/libwebp.lib ./deps/windows/lib/webp.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/gif.lib ./deps/windows/lib/gif.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/openjp2.lib ./deps/windows/lib/openjp2.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/lzma.lib ./deps/windows/lib/lzma.lib"
RUN "cp /tmp/tesseract-build/vcpkg/installed/x64-windows-static/lib/libsharpyuv.lib ./deps/windows/lib/sharpyuv.lib"
RUN "cp -r /tmp/tesseract-build/vcpkg/installed/x64-windows-static/include/tesseract/ ./deps/windows/include/"
RUN "cp -r /tmp/tesseract-build/vcpkg/installed/x64-windows-static/include/leptonica/ ./deps/windows/include/"

# Clean tesseract temporary build folder
RUN "rm -rf /tmp/tesseract-build/"

#######################
# Install sherpa-onnx #
#######################

# Create sherpa-onnx temporary build folder
RUN "mkdir -p /tmp/sherpa-onnx-build/"

# Download sherpa-onnx prebuilt binaries
RUN "curl -L -o /tmp/sherpa-onnx-build/sherpa-onnx-v1.13.2-win-x64-static-MT-Release.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.2/sherpa-onnx-v1.13.2-win-x64-static-MT-Release.tar.bz2"

# Extract sherpa-onnx prebuilt binaries
RUN "tar -xvjf /tmp/sherpa-onnx-build/sherpa-onnx-v1.13.2-win-x64-static-MT-Release.tar.bz2 -C /tmp/sherpa-onnx-build/"

# Copy sherpa-onnx binaries in project folder
RUN "cp /tmp/sherpa-onnx-build/sherpa-onnx-v1.13.2-win-x64-static-MT-Release/lib/*.lib ./deps/windows/lib/"

# Create sherpa-onnx header dependencies folder
RUN "mkdir -p ./deps/windows/include/sherpa-onnx/c-api/"

# Copy sherpa-onnx headers in project folder
RUN "cp /tmp/sherpa-onnx-build/sherpa-onnx-v1.13.2-win-x64-static-MT-Release/include/sherpa-onnx/c-api/*.h ./deps/windows/include/sherpa-onnx/c-api/"

# Clean sherpa-onnx temporary build folder
RUN "rm -rf /tmp/sherpa-onnx-build/"

#####################
# Install miniaudio #
#####################

# Create miniaudio temporary build folder
RUN "mkdir -p /tmp/miniaudio-build/"

# Download miniaudio header
RUN "curl -L -o /tmp/miniaudio-build/miniaudio.h https://raw.githubusercontent.com/mackron/miniaudio/refs/tags/0.11.25/miniaudio.h"

# Download miniaudio source
RUN "curl -L -o /tmp/miniaudio-build/miniaudio.c https://raw.githubusercontent.com/mackron/miniaudio/refs/tags/0.11.25/miniaudio.c"

# Temporarily use CMD to build miniaudio with MSVC
SHELL ["cmd", "/S", "/C"]

# Build miniaudio's dynamic library (not used in project for now)
RUN "C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cl /LD /O2 /MT %TEMP%\miniaudio-build\miniaudio.c /Fe:%TEMP%\miniaudio-build\miniaudio.dll

# Build miniaudio's static library
RUN "C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cl /c /O2 /MT %TEMP%\miniaudio-build\miniaudio.c /Fo:%TEMP%\miniaudio-build\miniaudio.obj && lib /OUT:%TEMP%\miniaudio-build\miniaudio.lib %TEMP%\miniaudio-build\miniaudio.obj

# Switch back to Git Bash as default shell
SHELL ["\"C:\\Program Files\\Git\\bin\\bash.exe\"", "-lc"]

# Copy miniaudio header in project folder
RUN "cp /tmp/miniaudio-build/miniaudio.h ./deps/windows/include/miniaudio.h"

# Copy miniaudio dynamic library in project folder (not used in project for now)
RUN "cp /tmp/miniaudio-build/miniaudio.dll ./deps/windows/lib/miniaudio.dll"

# Copy miniaudio static library in project folder
RUN "cp /tmp/miniaudio-build/miniaudio.lib ./deps/windows/lib/miniaudio.lib"

# Clean miniaudio build file
RUN "rm ./miniaudio.obj"

# Clean miniaudio temporary build folder
RUN "rm -rf /tmp/miniaudio-build/"

#####################################
## Install JavaScript dependencies ##
#####################################

# Copy project files
COPY . .

# Install dependencies
RUN "npm ci"

###################
## Build project ##
###################

# Build project C++ NAPI addon and TypeScript project source code
RUN "npm run build"

# Open shell in container
CMD ["bash"]
