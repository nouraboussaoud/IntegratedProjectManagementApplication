const axios = require("axios");

const owner = "nouraboussaoud";
const repoName = "IntegratedProjectManagementApplication";

const getLatestCommit = async (req, res) => {
    const url = `https://api.github.com/repos/${owner}/${repoName}/commits`;

    try {
        const response = await axios.get(url);
        const commitUrl = response.data[0].html_url; // Extract commit URL

        res.json({ latestCommit: commitUrl }); // Send response to client
    } catch (error) {
        console.error("Error fetching commit: ", error);
        res.status(500).json({ error: "Failed to fetch latest commit" });
    }
};

module.exports = {
    getLatestCommit,
};
