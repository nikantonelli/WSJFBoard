Ext.define('MyCustomGird', {
    extend: 'Rally.ui.grid.Grid',

    _requiresRefresh: function() {
    }

});

Ext.define('Rally.ui.grid.plugin.DependenciesPopoverPlugin', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.rallydependenciesplugin',
    require: ['Rally.ui.popover.DependenciesPopover'],

//    constructor: function(config) {
//        this.initConfig(config);
//        return this.callParent(arguments);
//    },
//
    init: function(cmp) {
        this.callParent(arguments);
        this._delayedTask = Ext.create('Ext.util.DelayedTask', this._showPopover, this);
        this.cmp.on('afterrender', function() {
            this.cmp.getEl().on('mouseover', this._onMouseOver, this, {
                delegate: '.formatted-id-link'
            });
            this.cmp.getEl().on('mouseout', this._onMouseOut, this, {
                delegate: '.formatted-id-link'
            });
        }, this, {single: true});
    },

    _onMouseOver: function(event, target) {
        this._delayedTask.delay(500, null, null, [target]);
    },

    _onMouseOut: function() {
        this._delayedTask.cancel();
    },

    _showPopover: function (target) {
        var el = Ext.get(target);
        var tr = el.up(this.cmp.view.getDataRowSelector());
        var record = this.cmp.view.getRecord(tr);

        if (record && !Ext.getElementById('description-popover')) {
            var targetRef = el.dom.href && _.last(el.dom.href.split('/detail/'));
            var targetOid = targetRef && Rally.util.Ref.getOidFromRef(targetRef);

            var popoverOptions = {
                context: this.cmp.context,
                field: 'Description',
                target: el,
                targetSelector: '#' + el.id
            };

            if (targetOid && record.get('ObjectID') !== targetOid) {
                popoverOptions.oid = targetOid;
                popoverOptions.type = Rally.util.Ref.getTypeFromRef(targetRef);
            } else {
                popoverOptions.record = record;
            }

            this.cmp.recordAction({description: 'showing formatted id hover on grid'});
            Rally.ui.popover.PopoverFactory.bake(popoverOptions);
        }
    },

    destroy: function() {
       if(this._delayedTask) {
           this._delayedTask.cancel();
       }
    }
});


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

        if (Ext.getCmp('wsjfApp').getSetting('usePrelim') === false) {
            items.push({
                xtype: 'wsjfBulkSetSize',
                id: 'wsjfBulkSetSize'
            });
        }

        _.each(items, function(item) {
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

    scopeType: 'release',
    settingsScope: 'project',

    stateful: true,

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);
        this._startApp(this);
    },

    getSettingsFields: function() {
        return [{
            xtype: 'textarea',
            fieldLabel: 'Query',
            name: 'query',
            anchor: '100%',
            cls: 'query-field',
            margin: '0 70 0 0',
            plugins: [{
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
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Use Preliminary Estimate',
            labelWidth: 200,
            name: 'usePrelim'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Overwrite WSJF on load',
            labelWidth: 200,
            name: 'useWSJFOverLoad'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Make WSJF field read-only',
            labelWidth: 200,
            name: 'useWSJFReadOnly'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Auto-sort on change',
            labelWidth: 200,
            name: 'useWSJFAutoSort'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show State Field',
            labelWidth: 200,
            name: 'useStateField'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show Project Field',
            labelWidth: 200,
            name: 'useProjectField'
        }];
    },


    launch: function() {

        var context = this.getContext();
        var app = this;


        this.add({
            xtype: 'container',
            id: 'headerBox',
            layout: 'column',
            border: 5,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        });

        Ext.getCmp('headerBox').add({
            xtype: 'rallyportfolioitemtypecombobox',
            labelWidth: 150,
            fieldLabel: 'Choose portfolio type:',
            id: 'itemType',
            margin: 10,
            listeners: {
                ready: function() {
                    app._startApp(app);
                },
                select: function() {
                    app._startApp(app);
                }
            },
            scope: this,
            align: 'left'
        });

        //We should prevent re-ordering of rank if we have sub-sampled by release
        //It makes for a confusing result otherwise
        var timeboxscope = this.getContext().getTimeboxScope();
        if (!timeboxscope) {
            Ext.getCmp('headerBox').add({
                xtype: 'rallybutton',
                id: 'MakeItSo',
                margin: 10,
                text: 'Commit WSJF as Rank',
                handler: this._storeRecords,
                scope: this
            });

            //Add the option to commit first record to top of global rank.
            Ext.getCmp('headerBox').add({
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Override global rank',
                id: 'globalCheck',
                value: false,
                margin: 10
            });

        }
    },

    _getFilters: function(app) {
        var filters = [];

        // We do not have timeboxes on higher level portfolio items

        if (Ext.getCmp('itemType').getRecord().data.Ordinal === 0) {
            var timeboxscope = this.getContext().getTimeboxScope();
            if (timeboxscope) {
                var filterQuery = timeboxscope.getQueryFilter();
                if (filterQuery.value) {
                    filters.push(filterQuery.value.config);
                } else {
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
            Ext.getCmp('MakeItSo').hide(); //Don't allow committing if subselected
            Ext.getCmp('globalCheck').hide();
            var filterObj = Rally.data.wsapi.Filter.fromQueryString(queryString);
            filterObj.itemId = filterObj.toString();
            filters.push(filterObj);
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
            {
                dataIndex: 'Name'
            }
        ];

        if (app.getSetting('useStateField')) {
            columnCfgs.push({
                dataIndex: 'State',
                text: 'State',
                align: 'center'
            });
        }

        if (app.getSetting('useProjectField')) {
            columnCfgs.push({
                dataIndex: 'Project',
                text: 'Project',
                align: 'center'
            });
        }

        columnCfgs.push({
            dataIndex: 'RROEValue',
            text: 'RR/OE',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetRisk');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            }
        }, {
            dataIndex: 'UserBusinessValue',
            text: 'Derived Value',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetValue');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            }
        }, {
            dataIndex: 'TimeCriticality',
            text: 'Time Criticality',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetTime');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            }
        });


        sizeCol = {
            text: 'Size',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetSize');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            }

        };

        // If we are using preliminary estimate, pick up that instead.

        if (app.getSetting('usePrelim')) {
            sizeCol = _.merge(sizeCol, {
                dataIndex: 'PreliminaryEstimate'
            });
        } else {
            sizeCol = _.merge(sizeCol, {
                dataIndex: 'JobSize'
            });
        }

        columnCfgs.push(sizeCol);

        wsjfCol = {
            dataIndex: 'WSJFScore',
            text: 'WSJF',
            align: 'center',
            listeners: {
                afterrender: function() {
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: '<p><strong>WSJF = (RR/OE + Derived Value + Time Criticality)/Job Size</strong></p>'
                    });
                }
            }
        };

        if (app.getSetting('useWSJFReadOnly')) {
            wsjfCol = _.merge(wsjfCol, {
                editor: null
            });
        }

        columnCfgs.push(wsjfCol);

        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: '40, 10, 40, 10',

//            plugins: ['rallydescriptionpopover' ],

            plugins: [
                'rallydependenciesplugin'
            ],

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
                sorters: [{
                    property: 'WSJFScore',
                    direction: 'DESC'
                }, {
                    property: 'DragAndDropRank',
                    direction: 'ASC'
                }],
                fetch: ['FormattedID', 'PreliminaryEstimate', 'Name', 'Release', 'Project', 'JobSize', 'RROEValue', 'TimeCriticality', 'UserBusinessValue', 'WSJFScore', 'State'],
                filters: app._getFilters(app)
            },

            listeners: {
                inlineeditsaved: function(grid, record, opts) {
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
                        num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality')) / record.get('PreliminaryEstimate').Value;
                    }
                } else {
                    num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality')) / record.get('JobSize');
                }

                //if the field is 'decimal' you can only have two decimal places....or it doesn't save it!
                num = num.toFixed(2);

                if (num !== oldVal) {
                    record.set('WSJFScore', num);
                    record.save({
                        callback: function() {
                            if (app.getSetting('useWSJFAutoSort')) {
                                Ext.getCmp('piGrid').refresh();
                            }
                        }
                    });
                }
            }

        });

//                Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

    },

    _recordToRank: 0,
    _rankingRecord: null,
    _store: null,

    _storeRecords: function() {

        this._store = Ext.getCmp('piGrid').store;
        this._recordToRank = 0;
        this._rankingRecord = this._store.data.items[this._recordToRank];

        if (Ext.getCmp('globalCheck').value === true) {

            this._rankingRecord.save({
                rankTo: 'TOP',
                callback: function(arg1, arg2, arg3) {
                    this._recordToRank += 1;
                    this._saveNextRecord();
                },
                scope: this
            });
        } else {
            this._recordToRank += 1;
            this._saveNextRecord();
        }
    },

    _saveNextRecord: function() {
        if (this._recordToRank < this._store.totalCount) {
            var nextRecord = this._store.data.items[this._recordToRank];
            Rally.data.Ranker.rankRelative({
                recordToRank: nextRecord,
                relativeRecord: this._rankingRecord,
                position: 'after',
                saveOptions: {
                    callback: function(arg1, arg2, arg3) {
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
    fields: [{
        name: 'Name',
        type: 'string'
    }, {
        name: 'Value',
        type: 'integer'
    }, {
        name: 'Description',
        type: 'string'
    }]
});

Ext.define('Rally.ui.grid.localWSJFBulkSet', {
    extend: Rally.ui.menu.bulk.MenuItem,
    alias: 'widget.localWSJFBulkSet',

    _makeHelpFromData: function() {
        html = '';

        _.each(this.config.data, function(record) {
            html += '<p><strong>' + record.Name + '(' + record.Value + '):  ' + record.Description + '</strong></p>';
        });

        return html;
    },

    _onSetParam: function(chooserTitle, chooserField) {

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

        var localBox = Ext.create('Ext.form.ComboBox', {
            id: 'localBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });


        var doChooser = Ext.create('Rally.ui.dialog.Dialog', {
            id: 'localChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: chooserTitle,
            items: localBox,
            buttons: [{
                text: 'OK',
                handler: function(arg1, arg2, arg3) {
                    _.each(this.records, function(record) {
                        record.set(chooserField, Ext.getCmp('localBox').value);
                        var num = (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality')) / record.get('JobSize');

                        //if the field is 'decimal' you can only have two decimal places....
                        record.set('WSJFScore', num.toFixed(2));
                        record.save({
                            callback: function() {
                                if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')) {
                                    Ext.getCmp('piGrid').refresh();
                                }
                            }
                        });
                    });
                    Ext.getCmp('localChooser').destroy();
                },
                scope: this
            }, {
                text: 'Cancel',
                handler: function() {
                    Ext.getCmp('localChooser').destroy();
                }
            }]
        });
    },

    getHelp: function() {
        return (this._makeHelpFromData());
    }

});


Ext.define('wsjfBulkSetRisk', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetRisk',

    config: {
        text: 'Risk Reduction',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose RR/OE potential', 'RROEValue');
        },
        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': ''
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': ''
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': ''
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': ''
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': ''
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': ''
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': ''
        }]
    }
});

Ext.define('wsjfBulkSetValue', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetValue',

    config: {
        text: 'Business Value',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Derived Value', 'UserBusinessValue');
        },
        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': ''
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': ''
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': ''
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': ''
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': ''
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': ''
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': ''
        }]
    }
});

Ext.define('wsjfBulkSetTime', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetTime',

    config: {
        text: 'Time Criticality',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Urgency Rating', 'TimeCriticality');
        },

        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': 'No urgency'
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': 'This year'
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': 'Within 6 months'
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': 'This quarter'
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': 'This month'
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': 'This week'
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': 'Immediately'
        }]
    }
});


Ext.define('wsjfBulkSetSize', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetSize',

    config: {
        text: 'Size',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Size/Effort Rating', 'JobSize');
        },
        data: [{
            'Name': 'XS',
            'Value': 1,
            'Description': 'Less than 1 week'
        }, {
            'Name': 'S',
            'Value': 2,
            'Description': '1 - 3 weeks'
        }, {
            'Name': 'M',
            'Value': 3,
            'Description': '1 - 2 months'
        }, {
            'Name': 'L',
            'Value': 5,
            'Description': '3 - 6 months'
        }, {
            'Name': 'XL',
            'Value': 8,
            'Description': '6 - 9 months'
        }, {
            'Name': 'XXL',
            'Value': 13,
            'Description': '9 - 18 months'
        }, {
            'Name': 'XXXL',
            'Value': 21,
            'Description': 'Two years or more'
        }]
    }
});