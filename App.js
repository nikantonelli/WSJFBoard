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
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {

        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: 30,
            columnCfgs: [
                'FormattedID',
                'Name',
                'Project',
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
                batchAction: true,
                model: 'portfolioitem/initiative',
                sorters: {
                    property: 'wsjfScore',
                    direction: 'DESC'
                },
                fetch: ['FormattedID', 'Name', 'Project', 'JobSize', 'RROEValue', 'TimeCriticality', 'UserBusinessValue', 'WSJFScore']
            },
            sortableColumns: false, //We will auto sort on WSJF number,
            listeners: {
                inlineeditsaved: function( grid, record, opts) {
                    var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize');

                    //if the field is 'decimal' you can only have two decimal places....
                    record.set('WSJFScore', num.toFixed(2));
                    record.save( {
                        callback: function() {
                            Ext.getCmp('piGrid').refresh();
                        }
                    });
                }
            }

        });

        //Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

        var picard = Ext.create('Ext.Container', {
            id: 'MakeItSo',
            layout: {
                type: 'vbox',
                align: 'center'
            }
        });

        picard.add( {
                xtype: 'rallybutton',
                text: 'Commit',
                handler: this._storeRecords,
                scope: this
        });

        this.add(picard);
    },

    _storeRecords: function() {

        var store = Ext.getCmp('piGrid').store;

        var rankingRecord = store.data.items[0];
        Rally.data.Ranker.rankToTop( rankingRecord );

        _.each(store.data.items, function(item) {
            var rankConfig = Rally.data.Ranker.generateRankParameters( { relativeRecord: rankingRecord, position: 'after' });
            var rrConfig = {
                    recordToRank: item,
                    relativeRecord: rankingRecord,
                    position: 'after'
                };

            Rally.data.Ranker.rankRelative(rrConfig);
            rankingRecord = item;
        });


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
                                        Ext.getCmp('piGrid').refresh();
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
                                        Ext.getCmp('piGrid').refresh();
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
                                        Ext.getCmp('piGrid').refresh();
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
