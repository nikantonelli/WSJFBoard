WSJFBoard
=========================

## Overview
Grid board to calculate WSJF from Risk, Value, TimeCriticality and JobSize and re-rank within Rally.  Add to a board with a Release filter in it's options to show lowest level Portfolio Item types with a 'Release' timebox setting.

Portfolio Items of interest can be selected by entering a query in the App Settings (via gear in top right of app).

If any filter is applied (i.e. via query box or by using a page filtered by release) the ability to commit the rank is removed. This is a safety feature to avoid time consuming mistakes (and not a bug)!

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/overview.jpg)

## Features

Inline editing:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/inline%20editing.jpg)

Normal editing menu:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/normal%20edit%20menu.jpg)

Bulk editing to standard values:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/Bulk%20edit%20menu.jpg)
![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/fibonacci.jpg)

The standard values can be changed in the data blocks at the end of the source code file (App.js) or directly in the html after you have loaded it into the custom html page.

Commit of viewed WSJF table as rank in the database:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/set%20global%20rank.jpg)

## Helper messages

Hover over the column titles to get pop-ups with 'reminder' info on the column. These too, can be changed in the data blocks to your needs.

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/hoverhelp.png)

## User settings

By going to "Edit App Settings" from the gear in the top right hand corner:

1. You can add a filter in the query box to sub-select various items. The app will prevent you from saving the rank if you do this - on purpose!

2. You can ask the app to recalculate (and save) all WSJF numbers every time it opens from the source values

3. You can stop users directly modifying the WSJF (to enforce the rule of setting the source values)

4. You can use either the 'JobSize' field or the 'Preliminary Estimate' (T-Shirt sizing).

If you change from JobSize to PrelimEst and set the 'recalculate on load' checkbox, the app will rework the numbers accordingly.

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/options.png)

## Caveat!

The current version only re-ranks the number of rows shown in the table. Set to 200 for the most re-ranked in one go.

If you are trying to rank more than 200 portfolio items, you are doing something wrong.

