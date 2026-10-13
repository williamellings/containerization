# Basimage: en liten Linux (Alpine) där Node 20 redan finns
FROM node:20-alpine

# Sätter miljövariabeln NODE_ENV till produktionsläge
ENV NODE_ENV=production

# Skapar mappen /app och går in i den
WORKDIR /app

# Kopierar bara package.json först (så att npm install kan cachas)
COPY package*.json ./

# Installerar beroenden, hoppar över utvecklingspaket och gör imagen mindre
RUN npm install --omit=dev && npm cache clean --force

# Kopierar koden och gör användaren node till ägare
COPY --chown=node:node server.js ./

# Gör att allt efter detta, inklusive appen, kör som node och inte som root (det är kravet)
USER node

# Dokumentation om att appen lyssnar på 3000. Den öppnar inga portar själv
EXPOSE 3000

# Kommandot som körs när containern startar
CMD ["node", "server.js"]