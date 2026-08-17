# Avarda Checkout 3: prenumerationsintegration

Templatesidan visar kundresan och sparar endast exempeldata lokalt. Produktionslösningen måste hantera följande på servern.

## Första köpet

1. Skicka prenumerationsradernas produkt-ID, antal och intervall från shoppen till den egna backendens checkout-endpoint.
2. Initiera Avarda Checkout 3 med `POST /api/partner/payments` och aktivera `checkoutSetup.recurringPayments`. Funktionen måste först vara tillåten i Avardas site definition.
3. Kunden genomför ett vanligt första köp och lämnar uttryckligt samtycke till återkommande betalning i Avarda.
4. När köpet är slutfört sparar backend `recurringPaymentToken`, ursprungligt `purchaseId`, intervall, nästa körning och kundens prenumerations-ID.

## Kommande leveranser

1. En schemalagd backendprocess validerar prenumerationsstatus, aktuellt pris, lager, leveransadress och ålderskontroll.
2. Skapa nästa köp med `POST /api/partner/payments/{purchaseId}/authorizerecurringpayment`. Skicka token, aktuella orderrader och en unik orderreferens.
3. Spara det nya purchase-ID:t och fortsätt med ordinarie orderhantering i Avarda.
4. Vid misslyckad auktorisering: skapa ingen leverans, markera försöket och informera kunden med möjlighet att uppdatera betalningssätt.

## Varukorg och leveransplaner

- Engångsrader levereras endast i den första ordern. Bara rader som kunden tydligt markerat som prenumeration sparas för framtida köp.
- Prenumerationsrader med samma intervall kan grupperas i en leveransplan. Olika intervall ska bli separata planer med egna nästa-orderdatum.
- Backend ska tillämpa centrala regler för vilka produkter och förpackningsstorlekar som får prenumereras på. Frontendmarkeringen är inte en säkerhetskontroll.
- Kunden ska aviseras före varje order med aktuellt innehåll, beräknat pris och sista tid för ändring. Pris och lager valideras när ordern skapas.

## Säkerhet och ansvar

- Avardas klienthemlighet, access-token och `recurringPaymentToken` får aldrig finnas i frontend eller `localStorage`.
- Alla ändringar från Mina sidor ska gå via autentiserade backend-endpoints och loggas.
- Paus/avslut ska stoppa nya schemalagda köp omedelbart. Redan skapade ordrar hanteras separat.
- Kundkommunikation ska tydligt visa intervall, pris för nästa order, ändringsfrist och att betalningen är återkommande.
- Ålderskontroll och juridiska villkor måste verifieras med slutlig checkout-, transportörs- och avtalslösning.

Källa: https://docs.avarda.com/checkout-3/more-features/recurring-payment/
