# ITD-day-data-preparation-scripts
![](https://ssl.solsort.com/_github_stat.gif)

Scripts for anonymising and cleaning up data, such that it is possible to open it up.

## Usage

Install dependencies

    npm install

(If it has already run, remove database, and jsons-dumps)

    rm -rf *.leveldb *.jsons

Generate json

    node preparedata.js adhl [filename of adhl sql dump]

