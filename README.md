WSJFBoard
=========================

## Overview

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/FiveVariable/images/allcolumns.png)

Grid board to calculate WSJF from Risk, Value, TimeCriticality and JobSize and re-rank within Rally.  Add to a board with a Release filter in its options to show lowest level Portfolio Item types with a 'Release' timebox setting (aka 'Program Increment').

The app relies on five custom fields to be present on project nodes. The fields should be created at the workspace level only. The app also requires the four impact fields to be present on the Portfolio Item type as a field type 'String' (not integer or decimal!)

The app will apply weightings depending on the project node that you are focussing on. This is so you can assign impact ratings to each Portfolio item, but then the app will apply a global bias to those. As an organisation, there might be more emphasis on one of the categories for the next planning period. By adjusting the weightings, you can re-order the items without having to go through each individual portfolio item resetting the impact ratings.

The control of the ability to change weightings is via the access to a particular project node. The project node will have one of the custom fields (ControlWSJF) as a boolean set to true. If the user is given access to that node, then the user can change project node weightings. For eaxample, you might want to give this ability to a Release Train Engineer.

The RTE would then set up their dashboards that would target all the project nodes that are under their control, e.g. in the picture, the RTE Control person is looking at the values in the 'Customer Site' project node.

The advantage of the mechanism deployed in the app, the RTE can experiment with bias values and then see if portfolio items would move up or move down (red and blue indications next to Weighted WSJF figure). Once decided on, the Weightings WSJF figures can be committed into Rally (via a custom field on the Portfolio Items).

The 'Weighted WSJF' figure is kept separate from the current WSJF figures initially. Once a decision has been made about the weightings and the Weighted WSJF figures, a push button will commit those numbers to the actual WSJF (held in the WSJFScore field)

The weightings (or 'Impact Rating') for the target node can be modified via a slider panel

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/FiveVariable/images/sliders.png)

The slider panel loads with the current values, but you then have to select a project node. This is handy if you want to transfer numbers from the current node to another one

Portfolio Items of interest can be selected by entering a query in the App Settings (via gear in top right of app).

If any filter is applied (i.e. via query box or by using a page filtered by release) the ability to commit the rank is removed. This is a safety feature to avoid time consuming mistakes (and not a bug)!


## Features

Inline editing is disabled apart from setting the Preliminary Estimate Sizing (if chosen in the options)

Normal editing menu:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/normal%20edit%20menu.jpg)

Bulk editing to standard values:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/FiveVariable/images/Bulk%20edit%20menu.png)

There is now the option to select negative numbers in terms of Impact. The app with take the magnitude of the impact and ignore the sign when calculating the WSJF figure.

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/FiveVariable/images/fibonacci.png)

The standard values can be changed in the data blocks at the end of the source code file (App.js) or directly in the html after you have loaded it into the custom html page.

Commit of viewed WSJF table as rank in the database:

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/set%20global%20rank.jpg)


## Helper messages

Hover over the column titles to get pop-ups with 'reminder' info on the column. These too, can be changed in the data blocks to your needs.

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/hoverhelp.png)

## User settings

By going to "Edit App Settings" from the gear in the top right hand corner:

1. You can add a filter in the query box to sub-select various items. The app will prevent you from saving the rank if you do this - on purpose!

2. You can stop users directly modifying the WSJF (to enforce the rule of setting the source values)

3. You can use either the 'JobSize' field or the 'Preliminary Estimate' (T-Shirt sizing).

If you change from JobSize to PrelimEst and set the 'recalculate on load' checkbox, the app will rework the numbers accordingly.

![alt text](https://github.com/nikantonelli/WSJFBoard/blob/master/images/options.png)

## Caveat!

The current version only re-ranks the number of rows shown in the table. Set to 200 for the most re-ranked in one go.

If you are trying to rank more than 200 portfolio items, you are doing something wrong.

