#!/usr/bin/env bash

echo "-----------------------------------------------------"
echo "          Add a new page to the app"
echo "-----------------------------------------------------"
echo ""
echo "Type the name of the new page (camelCase):"
read ccName

CcName=`echo "$ccName" | sed -e "s/\b\(.\)/\u\1/g"`      # CcName = BfLabel     -> Camel Case starting with Uppercase
vName=`echo $ccName | sed -e 's/\([A-Z]\)/-\L\1/g'`      # vName  = bf-label    -> Hypens all lowercase
wName=`echo $ccName"Demo"`                               # wName  = bfLabelDemo -> Camel case sufixed (wrapper comp)

ccNameComp=$CcName"Component"

echo ""
echo "A new module + default component is going to be created like:"
echo "    ng generate module pages/$vName -m=app.module"
echo "    ng generate component pages/$vName -m=$vName"
echo ""
echo " Is this ok?"
read x
ng generate module pages/$vName -m=app.module
ng generate component pages/$vName -m=$vName


# Add a new route to "app-routing.module.ts":"
sed -i "1i import { $ccNameComp } from './pages/$vName/$vName.component';" src/app/app-routing.module.ts
newRoute="  { path: '$vName',     component: $ccNameComp },"
routeMark="]; \/\/ RouteEnd"
sed -i "s/$routeMark/$newRoute\n$routeMark/" src/app/app-routing.module.ts


# Export the component from the module to be accessible from the router
sed -i "10i   , exports: [$ccNameComp]" src/app/pages/$vName/$vName.module.ts
