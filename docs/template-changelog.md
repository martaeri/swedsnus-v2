# Mallens ändringslogg

Ändringsloggen visar väsentliga förändringar för utvecklarna som använder webbplatsen som mall. Den öppnas från länken i sidfoten eller med `Ctrl + Shift + L`.

## Lägg till en post

Öppna det dolda redigeringsverktyget med `Ctrl + Alt + Shift + L`. Fyll i formuläret och välj **Skapa förhandsvisning**. Verktyget skapar hela den uppdaterade JSON-filen, som du kopierar och klistrar in i `data/template-changelog.json` via länken till GitHub.

Verktyget sparar ingenting automatiskt och innehåller inga inloggningsuppgifter till GitHub.

Det går även att redigera `data/template-changelog.json` manuellt och lägga den senaste posten överst i `entries`. Varje `id` ska vara unikt och kan med fördel använda formatet `ÅÅÅÅ-MM-DD-kort-namn`.

```json
{
  "id": "2026-08-17-exempel",
  "date": "2026-08-17",
  "type": "Funktion",
  "title": "Kort rubrik",
  "pages": ["index.html", "product.html"],
  "summary": "Vad som ändrades och varför.",
  "developerNote": "Vad utvecklarna behöver ta hänsyn till i den fullständiga lösningen.",
  "important": true
}
```

Tillåtna typer är inte tekniskt låsta, men använd i första hand `Design`, `Funktion`, `Innehåll`, `Produktdata` eller `Buggrättning`.

## Vad ska loggas?

- Nya eller förändrade funktioner.
- Förändrad navigation, sidstruktur eller datamodell.
- Viktiga design- eller innehållsbeslut.
- Juridiska texter eller krav som påverkar implementationen.
- Funktioner som använder exempeldata och behöver en riktig integration.
- Buggrättningar som förändrar avsett beteende.

Små visuella justeringar och interna tekniska rättningar behöver normalt inte tas med.

Ändringsloggen är offentlig. Lägg aldrig in personuppgifter, inloggningsuppgifter, affärshemligheter eller annan känslig information.
