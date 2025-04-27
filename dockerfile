# Étape 1 : Utiliser une image de base pour Node.js
FROM node:20

# Étape 2 : Définir le répertoire de travail
WORKDIR /app

# Étape 3 : Copier package.json et package-lock.json pour installer les dépendances
COPY package*.json ./

# Étape 4 : Installer les dépendances
RUN npm install

# Étape 5 : Copier tout le code source de l'application dans le conteneur
COPY . .

# Étape 6 : Exposer le port du serveur back-end
EXPOSE 5000

# Étape 7 : Lancer le serveur back-end
CMD ["npm", "run", "dev"]
