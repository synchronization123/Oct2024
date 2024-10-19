let uploadedFileName = "";
let projectKeysList = []; // Store project keys for later use
let exceptionsList = []; // Store exceptions for later display

// Function to show error messages
function showError(message) {
    const errorDiv = document.getElementById('errorDisplay');
    errorDiv.innerText = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function processFiles() {
    const changelogFile = document.getElementById('changelog').files[0];

    // Check file extension
    if (!changelogFile || changelogFile.name.split('.').pop() !== 'txt') {
        showError("Please upload a valid changelog.txt file.");
        return;
    }

    // Store the original file name (without extension) for later use in the export function
    uploadedFileName = changelogFile.name.split('.').slice(0, -1).join('.');

    // Fetch the changelog file and project keys from the JIRA API
    const changelogPromise = readFile(changelogFile);
    const projectsPromise = fetchProjectsFromJira();

    Promise.all([changelogPromise, projectsPromise]).then(files => {
        const changelogText = files[0];
        projectKeysList = files[1]; // Store project keys for later

        if (!projectKeysList.length) {
            showError("No project keys found in the JIRA API.");
            return;
        }

        // Update Show Projects and Show Exceptions button visibility
        document.getElementById('showProjectsBtn').style.display = 'block';
        document.getElementById('showExceptionsBtn').style.display = 'block';

        // Perform parsing
        const { jiraIds, exceptions } = extractJiraIds(changelogText, projectKeysList);

        // Output the result
        let outputText = 'Parsing Result:\n';
        if (jiraIds.length > 0) {
            outputText += jiraIds.sort().join(', ');

            // Display the count of JIRA IDs found
            document.getElementById('countDisplay').style.display = 'block';
            document.getElementById('countDisplay').innerText = `Total JIRA IDs found: ${jiraIds.length}`;
        } else {
            outputText += "No JIRA IDs found.";
            document.getElementById('countDisplay').style.display = 'none';
        }

        // Display the output in the textarea
        document.getElementById('output').value = outputText;

        // Enable export button if JIRA IDs are found
        if (jiraIds.length > 0) {
            document.getElementById('exportBtn').style.display = 'block';
            // Store the JIRA IDs globally for exporting
            window.jiraIdsForExport = jiraIds;
        } else {
            document.getElementById('exportBtn').style.display = 'none';
        }

        // Store exceptions globally for displaying in the modal
        exceptionsList = exceptions;

    }).catch(error => {
        console.error("Error processing files:", error);
    });
}

// Helper function to read the uploaded file (changelog.txt)
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

// Fetch project keys from JIRA API
function fetchProjectsFromJira() {
    return new Promise((resolve, reject) => {
        fetch('https://jira.demo.almworks.com/rest/api/2/project')
            .then(response => {
                // Check if the user is logged in (you may need to implement specific logic to check authentication)
                if (!response.ok) {
                    showError("You are not logged in to JIRA. Please log in to continue.");
                    throw new Error('Failed to fetch project keys from JIRA API');
                }
                return response.json();
            })
            .then(data => {
                // Extract project keys and format them as required
                const projectKeys = data.map(project => project.key).map(key => `${key}-`);
                resolve(projectKeys);
            })
            .catch(error => reject(error));
    });
}

// Main function to extract JIRA IDs and exceptions
function extractJiraIds(changelogText, projectKeys) {
    const jiraIds = new Set();
    const exceptions = [];
    
    // Create a regex pattern to match full project keys followed by numbers (case insensitive)
    const jiraPattern = new RegExp(`\\b(${projectKeys.join('|').replace(/-/g, '\\-')})(\\d+)\\b`, 'gi');

    let match;
    while ((match = jiraPattern.exec(changelogText)) !== null) {
        const jiraId = match[0].trim(); // Full matched JIRA ID

        // Add the JIRA ID to the set, ensuring it's displayed correctly
        jiraIds.add(jiraId);

        // Check for exceptions based on whitespace or no number after the dash
        if (!/\d/.test(jiraId.split('-')[1])) {
            exceptions.push(`Exception found: "${jiraId}" (No number after dash)`);
        } else {
            // Check for whitespace before/after the project key
            const trimmedJiraId = jiraId.split('-')[0].trim(); // Extract the project key part without the dash
            const matchingProjectKey = projectKeys.find(key => 
                trimmedJiraId.toUpperCase() === key.replace('-', '').toUpperCase()
            ); // Case insensitive match
            if (!matchingProjectKey) {
                exceptions.push(`Exception found: "${jiraId}" (Mismatch with project key)`);
            }
        }
    }

    return { jiraIds: Array.from(jiraIds), exceptions };
}

// Function to display the projects in a modal
function showProjects() {
    const projectsTextArea = document.getElementById('projectsList');
    projectsTextArea.value = projectKeysList.join('\n'); // Display projects in textarea
    $('#projectsModal').modal('show'); // Show the modal
}

// Function to display the exceptions in a modal
function showExceptions() {
    const exceptionsTextArea = document.getElementById('exceptionsList');
    exceptionsTextArea.value = exceptionsList.join('\n'); // Display exceptions in textarea
    $('#exceptionsModal').modal('show'); // Show the modal
}

// Function to export the results to Excel
function exportToExcel() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(window.jiraIdsForExport.map(jiraId => ({ "JIRA ID": jiraId })));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "JIRA IDs");
    const outputFileName = `Output_${uploadedFileName}.xlsx`;
    XLSX.writeFile(workbook, outputFileName);
}
