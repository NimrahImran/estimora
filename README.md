# Estimora

NYC property sales dashboard and three-month forecast. Built by Nimra Imran.

- **Dashboard:** 1,075,380 cleaned sales from 2003 to 2019, with Plotly charts and filters.
- **Forecast:** Seasonal naive, Holt-Winters, and SARIMA compete in rolling backtests for each area and target.
- **Your data:** upload a CSV and get a three-month forecast.
- **API:** documented at `/developers`.

## Run locally

```bash
npm install
npm run dev
```

## Contact form

Set these environment variables (see `.env.example`):

| Name | Value |
| --- | --- |
| `GMAIL_USER` | Gmail address that sends and receives enquiries |
| `GMAIL_APP_PASSWORD` | 16-character Google App Password |

## Rebuild the data

```bash
pip install -r pipeline/requirements.txt
python pipeline/build_data.py <folder-of-sales-parquet>
```

## Data

New York City Department of Finance property sales, 2003 to 2019, from a public cleaned copy of the official files. The data ends in December 2019, so the bundled forecast covers January to March 2020. Forecasts are estimates, not financial advice.
