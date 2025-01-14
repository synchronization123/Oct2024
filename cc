<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JIRA Changelog Extractor</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <style>
        .substring-match {
            color: red;
        }
    </style>
</head>
<body>

<div class="container mt-5">
    <h2>JIRA Changelog Extractor</h2>
    <div class="form-group">
        <label for="fileInput">Import Changelog (.txt):</label>
        <input type="file" class="form-control-file" id="fileInput" accept=".txt">
    </div>
    <button class="btn btn-primary" id="startButton">Start</button>
    <button class="btn btn-secondary" id="showExceptionsButton">Show Exceptions</button>

    <h4 class="mt-4">Output:</h4>
    <textarea id="output" class="form-control" rows="3" readonly></textarea>

    <h4 class="mt-4">Exceptions:</h4>
    <div id="exceptionsOutput" class="border p-3" style="min-height: 100px;"></div>
</div>

<script>
    const projectFilePath = 'projects.txt'; // Path for projects.txt in the same folder
    let projectKeys = [];
    let exceptions = []; // Store exceptions to display later

    // Fetch project keys from the hardcoded projects.txt file
    fetch(projectFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            projectKeys = data.split('\n').map(line => line.trim()).filter(line => line);
        })
        .catch(error => {
            console.error('Error fetching projects:', error);
            alert('Could not load project keys. Please ensure projects.txt is in the same directory as this HTML file.');
        });

    document.getElementById('startButton').addEventListener('click', () => {
        const fileInput = document.getElementById('fileInput');
        const output = document.getElementById('output');
        exceptions = []; // Reset exceptions

        if (fileInput.files.length === 0) {
            alert('Please import a changelog file.');
            return;
        }

        if (projectKeys.length === 0) {
            alert('Project keys are not loaded. Please check the projects.txt file path.');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const changelogData = e.target.result.split('\n').map(line => line.trim());
            const outputMatches = [];

            changelogData.forEach((line, index) => {
                const matches = line.match(/\b(\w+-\d+)\b/g) || [];
                matches.forEach(match => {
                    if (projectKeys.includes(match.split('-')[0] + '-')) {
                        outputMatches.push(match);
                    } else {
                        const invalidMatch = projectKeys.find(key => match.includes(key));
                        if (invalidMatch) {
                            exceptions.push(`Line ${index + 1}: <span class="substring-match">${line}</span> (Not a valid JIRA ID)`);
                        } else {
                            exceptions.push(`Line ${index + 1}: ${line} (Not a valid JIRA ID)`);
                        }
                    }
                });

                if (!matches.length && line.includes('INPR-')) {
                    exceptions.push(`Line ${index + 1}: ${line} (No JIRA IDs found)`);
                }
            });

            // Remove duplicates and format the output
            output.value = [...new Set(outputMatches)].join(', ');
        };

        reader.readAsText(file);
    });

    document.getElementById('showExceptionsButton').addEventListener('click', () => {
        const exceptionsOutput = document.getElementById('exceptionsOutput');
        exceptionsOutput.innerHTML = exceptions.length > 0 ? exceptions.join('<br>') : 'No exceptions found.';
    });
</script>

</body>
</html>