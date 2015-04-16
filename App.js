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

    scopeType: 'release',

//    items:[
//        { xtype: 'container',
//            id: 'headerBox',
//            layout: 'column',
//            border: 5,
//            style: {
//                borderColor: Rally.util.Colors.cyan,
//                borderStyle: 'solid'
//            }
//        }
//    ],

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);


        this._startApp(this);
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

        //Add the option to auto-sort or not
        Ext.getCmp('headerBox').add( {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Auto-sort on change',
            id: 'sortCheck',
            value: false,
            margin: 10
        });

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
            scope: this
        });

        Ext.getCmp('headerBox').add( {
                xtype: 'rallybutton',
                id: 'MakeItSo',
                margin: 10,
                text: 'Commit WSJF as Rank',
                handler: this._storeRecords,
                scope: this
        });
    },

    _getTimeBoxFilter: function() {
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

        return filters;
    },

    _startApp: function(app) {

        var modeltype = 'portfolioitem/' + Ext.getCmp('itemType').rawValue;
        var modelNames = [modeltype];

        var oldGrid = Ext.getCmp('piGrid');

        if (oldGrid) oldGrid.destroy();

        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: 30,

            columnCfgs: [
                'FormattedID',
                'Name',
                'Project',
                'Release.Name',
                'RROEValue',
                'UserBusinessValue',
                'TimeCriticality',
                'JobSize',
                'WSJFScore'
            ],
            bulkEditConfig: {
                showEdit: false,
                showTag: false,
                showParent: false,
                showRemove: false
            },
            context: this.getContext(),
            enableBulkEdit: true,
            enableRanking: true,

            storeConfig: {
                pageSize: 200,
                batchAction: true,
                model: modelNames,
                sorters: {
                    property: 'wsjfScore',
                    direction: 'DESC'
                },
                fetch: ['FormattedID', 'Name', 'Release', 'Project', 'JobSize', 'RROEValue', 'TimeCriticality', 'UserBusinessValue', 'WSJFScore', 'State'],
                filters: app._getTimeBoxFilter()
            },
            sortableColumns: false, //We will auto sort on WSJF number,
            listeners: {
                inlineeditsaved: function( grid, record, opts) {
                    var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');

                    //if the field is 'decimal' you can only have two decimal places....
                    record.set('WSJFScore', num.toFixed(2));
                    record.save( {
                        callback: function() {
                            if (Ext.getCmp('sortCheck').value === true){
                                Ext.getCmp('piGrid').refresh();
                            }
                        }
                    });
                }
            }

        });

        //Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

    },

    _recordToRank: 0,
    _rankingRecord: null,
    _store: null,

    _storeRecords: function() {

        this._store = Ext.getCmp('piGrid').store;
        this._recordToRank = 0;
        this._rankingRecord = this._store.data.items[this._recordToRank];

        this._rankingRecord.save( {
            rankTo: 'TOP',
            callback: function(arg1, arg2, arg3) {
                this._recordToRank += 1;
                this._saveNextRecord();
            },
            scope: this
        });
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
        {name: 'Value', type: 'integer' }
    ]
});


Ext.define('wsjfBulkSetRisk', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.wsjfBulkSetRisk',

    config: {
        text: 'Risk',
        handler: function(arg1, arg2, arg3) {
            this._onSetRisk(arg1, arg2, arg3);
        }
    },

    _onSetRisk: function(arg1, arg2, arg3) {
        var data = {
            dataValues: [
                { 'Name':'None', 'Value': 1 },
                { 'Name':'Minimal', 'Value': 3 },
                { 'Name':'Low', 'Value': 5 },
                { 'Name':'Medium', 'Value': 8 },
                { 'Name':'High', 'Value': 13 },
                { 'Name':'Extreme', 'Value': 21 }
            ]
        };

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: data,
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
            title: 'Choose Risk setting',
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
                                        if (Ext.getCmp('sortCheck').value === true){
                                            Ext.getCmp('piGrid').refresh();
                                        }

                                        Ext.getCmp('riskChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                }
            ]
        });
    }
});

Ext.define('wsjfBulkSetValue', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.wsjfBulkSetValue',

    config: {
        text: 'Business Value',
        handler: function(arg1, arg2, arg3) {
            this._onSetValue(arg1, arg2, arg3);
        }
    },

    _onSetValue: function(arg1, arg2, arg3) {
        var data = {
            dataValues: [
                { 'Name':'None', 'Value': 1 },
                { 'Name':'Minimal', 'Value': 3 },
                { 'Name':'Low', 'Value': 5 },
                { 'Name':'Medium', 'Value': 8 },
                { 'Name':'High', 'Value': 13 },
                { 'Name':'Extreme', 'Value': 21 }
            ]
        };

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: data,
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
                                        if (Ext.getCmp('sortCheck').value === true){
                                            Ext.getCmp('piGrid').refresh();
                                        }
                                        Ext.getCmp('valueChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                }
            ]
        });
    }
});

Ext.define('wsjfBulkSetTime', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.wsjfBulkSetTime',

    config: {
        text: 'Time Criticality',
        handler: function(arg1, arg2, arg3) {
            this._onSetTime(arg1, arg2, arg3);
        }
    },

    _onSetTime: function(arg1, arg2, arg3) {
        var data = {
            dataValues: [
                { 'Name':'None', 'Value': 1 },
                { 'Name':'Minimal', 'Value': 3 },
                { 'Name':'Low', 'Value': 5 },
                { 'Name':'Medium', 'Value': 8 },
                { 'Name':'High', 'Value': 13 },
                { 'Name':'Extreme', 'Value': 21 }
            ]
        };

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: data,
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
                                        if (Ext.getCmp('sortCheck').value === true){
                                            Ext.getCmp('piGrid').refresh();
                                        }
                                        Ext.getCmp('timeChooser').destroy();
                                    }
                            });
                        });
                    },
                    scope: this
                }
            ]
        });
    }
});
