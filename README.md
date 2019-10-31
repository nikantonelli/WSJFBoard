WSJFBoard
=========================

## NOTE: To prevent loading massive tranches of data (just because you started in the wrong peroject), you have to hit the Fetch Items button!

## Overview
Grid board to calculate WSJF from Risk, Value, TimeCriticality and PlanEstimate and re-rank on-screen.  Add to a page with a Release filter in if you wish.

Items of interest can be selected by entering a query in the App Settings (via gear in top right of app).

Any filter can be applied (i.e. via query box or by using a page filtered by release)

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

## Helper messages

Hover over the column titles to get pop-ups with 'reminder' info on the column. These too, can be changed in the data blocks to your needs.

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/hoverhelp.png)

## User settings

By going to "Edit App Settings" from the gear in the top right hand corner:

1. You can add a filter in the query box to sub-select various items. The app will prevent you from saving the rank if you do this - on purpose!

2. You can ask the app to recalculate (and save) all WSJF numbers every time it opens from the source values

3. You can stop users directly modifying the WSJF (to enforce the rule of setting the source values)

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/options.png)

If you are trying to rank more than 200 items, you are generally doing something wrong.

