const axios = require("axios");

const getLatestCommit = async (req, res) => {
    const owner = "nouraboussaoud";
    const repoName = "IntegratedProjectManagementApplication";
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

const getCommits = async (req, res) => {
    if (!req.user || !req.user.accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const accessToken = req.user.accessToken;
    const repoName = "IntegratedProjectManagementApplication";

    try {
        // Fetch user's GitHub profile
        const userResponse = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `token ${accessToken}` },
        });
        const owner = userResponse.data.login; // GitHub username

        // Fetch user's commits
        const url = `https://api.github.com/repos/${owner}/${repoName}/commits`;
        const response = await axios.get(url, {
            headers: { Authorization: `token ${accessToken}` },
        });

        const commits = response.data.slice(0, 5).map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            url: commit.html_url,
        }));

        res.json({ commits });
    } catch (error) {
        console.error("Error fetching commits: ", error);
        res.status(500).json({ error: "Failed to fetch commits" });
    }
};

const getRepositories = async (req, res) => {
    if (!req.user || !req.user.accessToken) {
        console.log(req.user);
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const accessToken = req.user.accessToken;

    try {
        // Fetch user's repositories
        const response = await axios.get("https://api.github.com/user/repos", {
            headers: { Authorization: `token ${accessToken}` },
        });

        const repositories = response.data.map(repo => ({
            id: repo.id,
            name: repo.name,
        }));

        res.json({ repositories });
    } catch (error) {
        console.error("Error fetching repositories: ", error);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
};

const getBranches = async (req, res) => {
    if (!req.user || !req.user.accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const accessToken = req.user.accessToken;
    const { repo } = req.params;

    try {
        // Fetch branches of the selected repository
        const response = await axios.get(`https://api.github.com/repos/${req.user.login}/${repo}/branches`, {
            headers: { Authorization: `token ${accessToken}` },
        });

        const branches = response.data.map(branch => ({
            name: branch.name,
        }));

        res.json({ branches });
    } catch (error) {
        console.error("Error fetching branches: ", error);
        res.status(500).json({ error: "Failed to fetch branches" });
    }
};

const getCommitsByBranch = async (req, res) => {
    if (!req.user || !req.user.accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const accessToken = req.user.accessToken;
    const { repo, branch } = req.params;

    try {
        // Fetch commits of the selected branch
        const response = await axios.get(`https://api.github.com/repos/${req.user.login}/${repo}/commits?sha=${branch}`, {
            headers: { Authorization: `token ${accessToken}` },
        });

        const commits = response.data.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            url: commit.html_url,
        }));

        res.json({ commits });
    } catch (error) {
        console.error("Error fetching commits: ", error);
        res.status(500).json({ error: "Failed to fetch commits" });
    }
};

module.exports = { getLatestCommit, getCommits, getRepositories, getBranches, getCommitsByBranch };