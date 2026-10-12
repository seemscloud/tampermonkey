# Auto Login

Jeden skrypt do automatycznego logowania do Airflow, Grafany, MinIO, RabbitMQ i Zabbixa na dowolnym hoście HTTP/HTTPS.

## Instalacja bez wklejania kodu

1. Zainstaluj rozszerzenie [Tampermonkey](https://www.tampermonkey.net/) dla swojej przeglądarki.
2. Kliknij **[Zainstaluj Auto Login](https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login.user.js)**.
3. W oknie Tampermonkey kliknij **Install / Zainstaluj**.
4. Jeśli masz wcześniejsze osobne skrypty dla tych serwisów, wyłącz je lub usuń, żeby nie uruchamiały się równolegle.
5. Otwórz lub odśwież stronę logowania wybranego serwisu. Skrypt rozpozna formularz, uzupełni dane i kliknie przycisk logowania.

Jeśli link pokazuje sam kod, otwórz **Tampermonkey → Dashboard / Panel → Utilities / Narzędzia → Import from URL / Instaluj z URL**. Wklej tam adres z linku **Zainstaluj Auto Login**, wybierz instalację i zatwierdź. Kopiujesz tylko adres, nie kod.

## Automatyczne aktualizacje z GitHuba

W ustawieniach Tampermonkey znajdź sekcję aktualizacji skryptów (**Script Update / Userscript updates**). Ustaw regularne sprawdzanie aktualizacji, np. raz dziennie, zamiast **Never / Nigdy**. Sprawdź też, czy aktualizacje nie są wyłączone w ustawieniach samego skryptu. Nazwy opcji mogą się różnić zależnie od języka i wersji rozszerzenia.

Skrypt ma już ustawione adresy aktualizacji z tego repozytorium. Po opublikowaniu nowszej wersji Tampermonkey pobierze ją przy kolejnym sprawdzeniu. Nie musisz ponownie kopiować kodu ani instalować skryptu. Aby przyspieszyć pobranie, użyj **Check for updates / Sprawdź aktualizacje** w Tampermonkey, a potem odśwież stronę serwisu.

Aktualizacje wymagają podniesienia numeru `@version` przy publikowaniu zmian w repozytorium; sam push zmienionego kodu z tym samym numerem nie wystarczy. Nie trzeba podłączać konta GitHub ani konfigurować synchronizacji w chmurze — aktualizacje są pobierane z publicznego adresu skryptu.

## Dane logowania

| Serwis | Login | Hasło |
| --- | --- | --- |
| Airflow | airflow | airflow |
| Grafana | admin | admin |
| MinIO | minioadmin | minioadmin |
| RabbitMQ | guest | guest |
| Zabbix | Admin | zabbix |

Logowanie powiedzie się, jeśli serwis akceptuje powyższe dane. Skrypt wykonuje maksymalnie 3 próby z odstępem co najmniej 2 sekund. Licznik przetrwa przeładowanie strony w tej samej karcie; zamknij kartę i otwórz nową, aby rozpocząć ponownie. Obsługuje też potwierdzenie MinIO i przycisk pominięcia początkowej zmiany hasła w Grafanie.

Szczegóły: [aktualizacje skryptów](https://www.tampermonkey.net/documentation.php#meta:updateURL) i [import z adresu URL](https://www.tampermonkey.net/faq.php#Q106) w dokumentacji Tampermonkey.
