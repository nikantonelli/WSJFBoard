Ext.define('Rally.ui.bulk.RecordMenuFix', {
    override: 'Rally.ui.menu.bulk.RecordMenu',
    _getMenuItems: function() {
        var records = this.getRecords();
        var items = this.callParent(arguments);
        items.push({
             xtype: 'wsjfBulkSetRisk',
             id: 'wsjfBulkSetRisk'
         });
        items.push({
             xtype: 'wsjfBulkSetValue',
             id: 'wsjfBulkSetValue'
        });
        items.push({
             xtype: 'wsjfBulkSetTime',
             id: 'wsjfBulkSetTime'
        });

        if (Ext.getCmp('wsjfApp').getSetting('usePrelim') === false){
            items.push({
                 xtype: 'wsjfBulkSetSize',
                 id: 'wsjfBulkSetSize'
            });
        }

        _.each(items, function (item) {
            Ext.apply(item, {
                records: records,
                store: this.store,
                onBeforeAction: this.onBeforeAction,
                onActionComplete: this.onActionComplete,
                context: this.getContext()
            });
        }, this);

        return items;
     }
});


Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',

    id: 'wsjfApp',

    config: {
        scrollFlags:  { 'both': false,  'overflowY': 'no',  'overflowX': 'auto',  'y': false ,  'x': true }
    },

    scopeType: 'release',
    settingsScope: 'project',

    stateful: true,

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);
        this._startApp(this);
    },

    getSettingsFields: function() {
        return [
            {
                xtype: 'textarea',
                fieldLabel: 'Query',
                name: 'query',
                anchor: '100%',
                cls: 'query-field',
                margin: '0 70 0 0',
                plugins: [
                    {
                        ptype: 'rallyhelpfield',
                        helpId: 194
                    },
                    'rallyfieldvalidationui'
                ],
                validateOnBlur: false,
                validateOnChange: false,
                validator: function(value) {
                    try {
                        if (value) {
                            Rally.data.wsapi.Filter.fromQueryString(value);
                        }
                        return true;
                    } catch (e) {
                        return e.message;
                    }
                }
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Use Preliminary Estimate',
                labelWidth: 200,
                name: 'usePrelim'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Overwrite WSJF on load',
                labelWidth: 200,
                name: 'useWSJFOverLoad'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Make WSJF field read-only',
                labelWidth: 200,
                name: 'useWSJFReadOnly'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Auto-sort on change',
                labelWidth: 200,
                name: 'useWSJFAutoSort'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show State Field',
                labelWidth: 200,
                name: 'useStateField'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Project Field',
                labelWidth: 200,
                name: 'useProjectField'
            }
        ];
    },


    launch: function() {

        var context = this.getContext();
        var app = this;


        this.add( { xtype: 'container',
            id: 'headerBox',
            layout: 'column',
            border: 5,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        }
        );

        Ext.getCmp('headerBox').add( {
            xtype: 'rallyportfolioitemtypecombobox',
            labelWidth: 150,
            fieldLabel: 'Choose portfolio type:',
            id: 'itemType',
            margin: 10,
            listeners: {
                ready: function() { app._startApp(app); },
                select: function() { app._startApp(app); }
            },
            scope: this,
            align: 'left'
        });

        //We should prevent re-ordering of rank if we have sub-sampled by release
        //It makes for a confusing result otherwise
        var timeboxscope = this.getContext().getTimeboxScope();
            if (!timeboxscope) {
                Ext.getCmp('headerBox').add( {
                    xtype: 'rallybutton',
                    id: 'MakeItSo',
                    margin: 10,
                    text: 'Commit WSJF as Rank',
                    handler: this._storeRecords,
                    scope: this
                });

                //Add the option to commit first record to top of global rank.
                Ext.getCmp('headerBox').add( {
                    xtype: 'rallycheckboxfield',
                    fieldLabel: 'Override global rank',
                    id: 'globalCheck',
                    value: false,
                    margin: 10
                });

            }

//
//        Ext.getCmp('headerBox').add( {
//            xtype: 'rallycheckboxfield',
//            fieldLabel: 'Show Help',
//            id: 'helpButton',
//            margin: 10,
//            listeners: {
//                change: function() {
//                    if (this.value === true) {
//                        Ext.getCmp('helptext').show();
//                    } else {
//                        Ext.getCmp('helptext').hide();
//                    }
//                }
//            },
//            scope: this
//        });
//
//        var helptext = Ext.create('Rally.ui.dialog.Dialog', {
//             autoShow: true,
//             hidden: true,
//             id: 'helptext',
//             draggable: true,
//             width: 300,
//             title: 'Brief Help',
//             items: {
//                 xtype: 'component',
//                 html: 'WSJF = (Risk + Value + Urgency)/Size',
//                 padding: 10
//             }
//         });
//
//        Ext.getCmp('headerBox').add( helptext );
//

    },

    _getFilters: function(app) {
        var filters = [];

        // We do not have timeboxes on higher level portfolio items

        if ( Ext.getCmp('itemType').getRecord().data.Ordinal === 0) {
            var timeboxscope = this.getContext().getTimeboxScope();
            if (timeboxscope) {
                var filterQuery = timeboxscope.getQueryFilter();
                if (filterQuery.value){
                    filters.push(filterQuery.value.config);
                }
                else {
                    filters.push({
                            property: 'Release',
                            operator: '=',
                            value: null

                    });
                }
            }
        }

        filters.push({
                        property: 'State.Name',
                        operator: '!=',
                        value: 'Done'
                    });

        //Now get the settings query box and apply those settings
        var queryString = app.getSetting('query');
        if (queryString) {
            Ext.getCmp('MakeItSo').hide();  //Don't allow committing if subselected
            Ext.getCmp('globalCheck').hide();
            var filterObj = Rally.data.wsapi.Filter.fromQueryString(queryString);
            filterObj.itemId = filterObj.toString();
            filters.push( filterObj );
        }

        return filters;
    },

    _startApp: function(app) {

        var modeltype = 'portfolioitem/' + Ext.getCmp('itemType').rawValue;
        var modelNames = [modeltype];

        var oldGrid = Ext.getCmp('piGrid');

        if (oldGrid) oldGrid.destroy();

        var columnCfgs = [
                'FormattedID',
                'Name'
        ];

        if (app.getSetting('useStateField')) {
            columnCfgs.push(
                {
                    dataIndex: 'State',
                    text: 'State',
                    align: 'center'
                });
        }

        if (app.getSetting('useProjectField')) {
            columnCfgs.push(
                {
                    dataIndex: 'Project',
                    text: 'Project',
                    align: 'center'
                });
        }

        columnCfgs.push(
                {
                    dataIndex: 'RROEValue',
                    text: 'Upside',
                    align: 'center',
                    listeners: {
                        afterrender: function() {
                            thisMenu = Ext.create('wsjfBulkSetRisk');
                            helpHTML = thisMenu.getHelp();
                            Ext.create('Rally.ui.tooltip.ToolTip', {
                                target : this.getEl(),
                                html: helpHTML
                            });
                        }
                    }
                },
                {
                    dataIndex: 'UserBusinessValue',
                    text: 'Derived Value',
                    align: 'center',
                    listeners: {
                        afterrender: function() {
                            thisMenu = Ext.create('wsjfBulkSetValue');
                            helpHTML = thisMenu.getHelp();
                            Ext.create('Rally.ui.tooltip.ToolTip', {
                                target : this.getEl(),
                                html: helpHTML
                            });
                        }
                    }
                },
                {
                    dataIndex: 'TimeCriticality',
                    text: 'Urgency',
                    align: 'center',
                    listeners: {
                        afterrender: function() {
                            thisMenu = Ext.create('wsjfBulkSetTime');
                            helpHTML = thisMenu.getHelp();
                            Ext.create('Rally.ui.tooltip.ToolTip', {
                                target : this.getEl(),
                                html: helpHTML
                            });
                        }
                    }
                }
        );


        sizeCol = {
                    text: 'Effort',
                    align: 'center',
                    listeners: {
                        afterrender: function() {
                            thisMenu = Ext.create('wsjfBulkSetSize');
                            helpHTML = thisMenu.getHelp();
                            Ext.create('Rally.ui.tooltip.ToolTip', {
                                target : this.getEl(),
                                html: helpHTML
                            });
                        }
                    }

                };

        // If we are using preliminary estimate, pick up that instead.

        if (app.getSetting('usePrelim')) {
            sizeCol = _.merge(sizeCol,
                {
                    dataIndex: 'PreliminaryEstimate'
                });
        } else {
            sizeCol = _.merge(sizeCol,
                {
                    dataIndex: 'JobSize'
                });
        }

        columnCfgs.push( sizeCol);

        wsjfCol =  {
                    dataIndex: 'WSJFScore',
                    text: 'WSJF',
                    align: 'center',
                    listeners: {
                        afterrender: function() {
                            Ext.create('Rally.ui.tooltip.ToolTip', {
                                target : this.getEl(),
                                html: '<p><strong>WSJF = (Upside + Value + Urgency)/Effort</strong></p>'
                            });
                        }
                    }
                };

        if (app.getSetting('useWSJFReadOnly')) {
            wsjfCol = _.merge(wsjfCol,
                {
                    editor: null
                });
        }

        columnCfgs.push( wsjfCol);

        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: 10,

            columnCfgs: columnCfgs,

            bulkEditConfig: {
                showEdit: false,
                showTag: false,
                showParent: false,
                showRemove: false
            },
            context: this.getContext(),
            enableBulkEdit: true,
            enableRanking: true,
            enableColumnResize: true,
            sortableColumns: true,

            storeConfig: {
                pageSize: 200,
                batchAction: true,
                model: modelNames,
                sorters: [
                    {
                        property: 'WSJFScore',
                        direction: 'DESC'
                    },
                    {
                        property: 'DragAndDropRank',
                        direction: 'ASC'
                    }
                ],
                fetch: ['FormattedID', 'PreliminaryEstimate', 'Name', 'Release', 'Project', 'JobSize', 'RROEValue', 'TimeCriticality', 'UserBusinessValue', 'WSJFScore', 'State'],
                filters: app._getFilters(app)
            },
            
            listeners: {
                inlineeditsaved: function( grid, record, opts) {
                    this._saveWSJF(record);
                },
                load: function(store) {
                    if (app.getSetting('useWSJFOverLoad')) {

                        var records = store.getRecords();
                        _.each(records, this._saveWSJF);
                    }
                }
            },

            _saveWSJF: function(record) {
                var num = 0;
                var oldVal = record.get('WSJFScore').toFixed(2);

                if (app.getSetting('usePrelim')) {
                    if (record.get('PreliminaryEstimate') && ((peVal = record.get('PreliminaryEstimate').Value) > 0)) {
                        num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('PreliminaryEstimate').Value;
                    }
                } else {
                     num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');
                }

                //if the field is 'decimal' you can only have two decimal places....or it doesn't save it!
                num = num.toFixed(2);

                if ( num !== oldVal) {
                    record.set('WSJFScore', num);
                    record.save( {
                        callback: function() {
                            if (app.getSetting('useWSJFAutoSort')){
                                Ext.getCmp('piGrid').refresh();
                            }
                        }
                    });
                }
            }

        });

//        Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

    },

    _recordToRank: 0,
    _rankingRecord: null,
    _store: null,

    _storeRecords: function() {

        this._store = Ext.getCmp('piGrid').store;
        this._recordToRank = 0;
        this._rankingRecord = this._store.data.items[this._recordToRank];

        if (Ext.getCmp('globalCheck').value === true){

            this._rankingRecord.save( {
                rankTo: 'TOP',
                callback: function(arg1, arg2, arg3) {
                    this._recordToRank += 1;
                    this._saveNextRecord();
                },
                scope: this
            });
        }
        else
        {
            this._recordToRank += 1;
            this._saveNextRecord();
        }
    },

    _saveNextRecord: function ()
    {
        if ( this._recordToRank < this._store.totalCount){
            var nextRecord = this._store.data.items[this._recordToRank];
            Rally.data.Ranker.rankRelative( {
                recordToRank: nextRecord,
                relativeRecord: this._rankingRecord,
                position: 'after',
                saveOptions: {
                    callback: function(arg1, arg2, arg3){
                        this._recordToRank += 1;
                        this._rankingRecord = arg1;
                        this._saveNextRecord();
                    },
                    scope: this
                }
            });
        }
    }



});

Ext.define('dataModel', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'Name',  type: 'string'  },
        {name: 'Value', type: 'integer' },
        {name: 'Description', type: 'string' }
    ]
});

Ext.define('Rally.ui.grid.localWSJFBulkSet', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.localWSJFBulkSet',

    _makeHelpFromData: function() {
        html = '';

        _.each( this.config.data, function(record) {
            html += '<p>' + record.Name + '(' + record.Value + '):  ' + record.Description + '</p>';
        });

        return html;
    },

    getHelp: function() {
        return (this._makeHelpFromData());
    }

});


Ext.define('wsjfBulkSetRisk', {
    extend:  Rally.ui.grid.localWSJFBulkSet ,
    alias: 'widget.wsjfBulkSetRisk',

    config: {
        text: 'Risk',
        handler: function(arg1, arg2, arg3) {
            this._onSetRisk(arg1, arg2, arg3);
        },
        data: [
                { 'Name':'None', 'Value': 0, 'Description': 'No upside' },
                { 'Name':'Minimal', 'Value': 1, 'Description': 'Up to 5%' },
                { 'Name':'Low', 'Value': 2, 'Description': '5% - 10%' },
                { 'Name':'Medium', 'Value': 3, 'Description': '10% - 25%' },
                { 'Name':'High', 'Value': 5, 'Description': '25% - 50%' },
                { 'Name':'Very High', 'Value': 8, 'Description': '50% - 100%' },
                { 'Name':'Extreme', 'Value': 13, 'Description': 'More than double' }
            ]
    },

    _onSetRisk: function(arg1, arg2, arg3) {

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: this.config.data,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'dataValues'
                }
            }
        });

        var riskBox = Ext.create( 'Ext.form.ComboBox', {
            id: 'riskBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });

        var doChooser = Ext.create( 'Rally.ui.dialog.Dialog', {
            id: 'riskChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: 'Choose Upside potential',
            items: riskBox,
            buttons: [
                {   text: 'OK',
                    handler: function(arg1, arg2, arg3) {
                        _.each(this.records, function(record) {
                            record.set('RROEValue', Ext.getCmp('riskBox').value);
                            var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');

                            //if the field is 'decimal' you can only have two decimal places....
                            record.set('WSJFScore', num.toFixed(2));
                            record.save( {
                                    callback: function() {
                                        if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')){
                                            Ext.getCmp('piGrid').refresh();
                                        }

                                        Ext.getCmp('riskChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                },
                {
                    text: 'Cancel',
                    handler: function(){ Ext.getCmp('riskChooser').destroy(); }
                }
            ]
        });
    }
});

Ext.define('wsjfBulkSetValue', {
    extend:  Rally.ui.grid.localWSJFBulkSet ,
    alias: 'widget.wsjfBulkSetValue',

    config: {
        text: 'Business Value',
        handler: function(arg1, arg2, arg3) {
            this._onSetValue(arg1, arg2, arg3);
        },
        data: [
                { 'Name':'None', 'Value': 0, 'Description': 'No value' },
                { 'Name':'Minimal', 'Value': 1, 'Description': 'Less than $10k' },
                { 'Name':'Low', 'Value': 2, 'Description': '$10K - $25K' },
                { 'Name':'Medium', 'Value': 3, 'Description': '$25K - $50K' },
                { 'Name':'High', 'Value': 5, 'Description': '$50K - 100K' },
                { 'Name':'Very High', 'Value': 8, 'Description': '$100K - $250K' },
                { 'Name':'Extreme', 'Value': 13, 'Description': 'Over $250K' }
            ]
    },

    _onSetValue: function(arg1, arg2, arg3) {

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: this.config.data,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'dataValues'
                }
            }
        });

        var valueBox = Ext.create( 'Ext.form.ComboBox', {
            id: 'valueBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });

        var doChooser = Ext.create( 'Rally.ui.dialog.Dialog', {
            id: 'valueChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: 'Choose Business Value setting',
            items: valueBox,
            buttons: [
                {   text: 'OK',
                    handler: function(arg1, arg2, arg3) {
                        _.each(this.records, function(record) {
                            record.set('UserBusinessValue', Ext.getCmp('valueBox').value);
                            var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');

                            //if the field is 'decimal' you can only have two decimal places....
                            record.set('WSJFScore', num.toFixed(2));
                            record.save( {
                                    callback: function() {
                                        if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')){
                                            Ext.getCmp('piGrid').refresh();
                                        }
                                        Ext.getCmp('valueChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                },
                {
                    text: 'Cancel',
                    handler: function(){ Ext.getCmp('valueChooser').destroy(); }
                }
            ]
        });
    }
});

Ext.define('wsjfBulkSetTime', {
    extend:  Rally.ui.grid.localWSJFBulkSet ,
    alias: 'widget.wsjfBulkSetTime',

    config: {
        text: 'Time Criticality',
        handler: function(arg1, arg2, arg3) {
            this._onSetTime(arg1, arg2, arg3);
        },

        data: [
                { 'Name':'None', 'Value': 0, 'Description': 'No urgency' },
                { 'Name':'Minimal', 'Value': 1, 'Description': 'This year' },
                { 'Name':'Low', 'Value': 2, 'Description': 'Within 6 months' },
                { 'Name':'Medium', 'Value': 3, 'Description': 'This quarter' },
                { 'Name':'High', 'Value': 5, 'Description': 'This month' },
                { 'Name':'Very High', 'Value': 8, 'Description': 'This week' },
                { 'Name':'Extreme', 'Value': 13, 'Description': 'Immediately' }
            ]
    },

    _onSetTime: function(arg1, arg2, arg3) {

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: this.config.data,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'dataValues'
                }
            }
        });

        var timeBox = Ext.create( 'Ext.form.ComboBox', {
            id: 'timeBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });

        var doChooser = Ext.create( 'Rally.ui.dialog.Dialog', {
            id: 'timeChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: 'Choose Time Criticality',
            items: timeBox,
            buttons: [
                {   text: 'OK',
                    handler: function(arg1, arg2, arg3) {
                        _.each(this.records, function(record) {
                            record.set('TimeCriticality', Ext.getCmp('timeBox').value);
                            var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');

                            //if the field is 'decimal' you can only have two decimal places....
                            record.set('WSJFScore', num.toFixed(2));
                            record.save( {
                                    callback: function() {
                                        if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')){
                                            Ext.getCmp('piGrid').refresh();
                                        }
                                        Ext.getCmp('timeChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                },
                {
                    text: 'Cancel',
                    handler: function(){ Ext.getCmp('timeChooser').destroy(); }
                }
            ]
        });
    }
});


Ext.define('wsjfBulkSetSize', {
    extend:  Rally.ui.grid.localWSJFBulkSet ,
    alias: 'widget.wsjfBulkSetSize',

    config: {
        text: 'Job Size',
        handler: function(arg1, arg2, arg3) {
            this._onSetSize(arg1, arg2, arg3);
        },
        data: [
                { 'Name':'XS', 'Value': 1, 'Description': 'Less than 1 week' },
                { 'Name':'S', 'Value': 2, 'Description': '1 - 3 weeks' },
                { 'Name':'M', 'Value': 3, 'Description': '1 - 2 months' },
                { 'Name':'L', 'Value': 5, 'Description': '3 - 6 months' },
                { 'Name':'XL', 'Value': 8, 'Description': '6 - 9 months' },
                { 'Name':'XXL', 'Value': 13, 'Description': '9 - 18 months' },
                { 'Name':'XXXL', 'Value': 21, 'Description': 'Two years or more' }
            ]
    },

    _onSetSize: function(arg1, arg2, arg3) {

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: this.config.data,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'dataValues'
                }
            }
        });

        var localBox = Ext.create( 'Ext.form.ComboBox', {
            id: 'localBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });

        var doChooser = Ext.create( 'Rally.ui.dialog.Dialog', {
            id: 'localChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: 'Choose Job Size',
            items: localBox,
            buttons: [
                {   text: 'OK',
                    handler: function(arg1, arg2, arg3) {
                        _.each(this.records, function(record) {
                            record.set('JobSize', Ext.getCmp('localBox').value);
                            var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');

                            //if the field is 'decimal' you can only have two decimal places....
                            record.set('WSJFScore', num.toFixed(2));
                            record.save( {
                                    callback: function() {
                                        if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')){
                                            Ext.getCmp('piGrid').refresh();
                                        }
                                        Ext.getCmp('localChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                },
                {
                    text: 'Cancel',
                    handler: function(){ Ext.getCmp('localChooser').destroy(); }
                }
            ]
        });
    }
});
