# Use the official Python image as a base image
FROM python:3.11

# Set the working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    libxkbcommon-x11-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk1.0-0 \
    libgtk-3-0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    fonts-liberation \
    libappindicator3-1 \
    lsb-release \
    gnupg \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Add Google Chrome's official GPG key and repository
RUN mkdir -p /usr/share/keyrings \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# Install Google Chrome
RUN apt-get update && apt-get install -y google-chrome-stable

# Set up Chrome options
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Copy the requirements file and install dependencies
COPY pyproject.toml poetry.lock ./
RUN pip install poetry \
    && poetry export -f requirements.txt --output requirements.txt --without-hashes \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y poetry

# Copy the rest of the application code
COPY . .

# Command to run the application
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "360", "src.main:app"]
