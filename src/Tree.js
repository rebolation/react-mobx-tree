import * as React from "react";
import Paper from "@material-ui/core/Paper";
import Button from '@material-ui/core/Button';
import { observable, reaction, computed, autorun, action, transaction } from 'mobx';
import { observer, inject, Provider } from "mobx-react"
import { asyncAction } from 'mobx-utils'

import './tree.scss';

class TreeStore {

	constructor(config){ this.config = config; this.nodes = config.data; }
	config = null;
	// callbacks = null;
	@observable nodes = null;
	currentnode = this.nodes ? this.nodes.find( el => el.s == 1 ) : null;
	editingnode = null;
	edit_timeout = null;
	dnd_source = null;
	dnd_target = null;
	dnd_toggle = null;
	dnd_pass = null;
	hover_timeout = null;

	findbyid = (id) => this.nodes.find( el => el.id == id );
	findbynode = (node) => this.nodes.find( el => el.id == node.id );
	findIndex = (node) => this.nodes.findIndex( (el) => el.id == node.id );

	@action selectbyid = (id) => { this.selectbynode(this.findbyid(id)); }
	@action selectbynode = (node) => {
		this.select_clear();
		this.currentnode = node;
		this.nodes.map( el => el.s = 0 );
		this.findbynode(node).s = 1;
	}
	@action select_clear = () => this.nodes.map( el => el.s = '' );
	@action dnd_clear = () => this.nodes.map( el => el.d = '' );

	@action tojson = () => {
		let json = JSON.parse(JSON.stringify(this.nodes));
		json.forEach( el => {
			delete el.c;
			delete el.d;
		});
		json = JSON.stringify(json);
		console.log(json);
	}

	@action toggleNode = (e, node, path) => {
		const node_ = this.findbyid(node.id);
		clearTimeout(this.hover_timeout);
		node_.c = node_.c == 0 ? 1 : 0;
	}
	@action foldNode = (e, node, path) => {
		e.preventDefault();
		e.stopPropagation();
		const node_ = this.findbyid(node.id);
		clearTimeout(this.hover_timeout);
		node_.c = 1;
	}
	@action unfoldNode = (e, node, path) => {
		e.preventDefault();
		e.stopPropagation();
		const node_ = this.findbyid(node.id);
		clearTimeout(this.hover_timeout);
		node_.c = 0;
	}

	// @action setCallback = (name, fn) => {
		// this.config.callback[name] = fn;
	// }

	@action selectNode = (e, node, path) => {
		if( this.currentnode && node.id == this.currentnode.id) return;
		this.selectbynode(node);
		// console.log(node.id, node.t, node.o, path);
		try { this.config.callback['sel'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action updNode = () => {
		if( !this.currentnode ) return;
		const node = this.currentnode;
		try { this.config.callback['upd'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action addNode = () => {
		const newid = Math.max(...this.nodes.map(el => el.id)) + 1;
		const newpid = this.currentnode ? this.currentnode.pid : 0;
		this.nodes.push({id:newid, pid:newpid, o:0, t:'new', c:0, d:'', s:1});
		const p_children = this.nodes.filter( el => el.pid == newpid );
		const neword = Math.max(...this.nodes.map(el => el.o)) + 1;
		const node = this.findbyid(newid);
		node.o = neword;
		p_children.sort( (a,b) => a.o - b.o );
		// p_children.forEach( (el,index) => el.o = index + 1 );
		this.selectbyid(newid);
		try { this.config.callback['add'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action delNode = () => {
		if( !this.currentnode ) return;
		const node = this.currentnode;
		this.nodes.splice(this.findIndex(this.currentnode), 1);
		this.currentnode = null;
		try { this.config.callback['del'](node) } catch(err) { console.log(err) };
	}
	@action secNode = () => {
		if( !this.currentnode ) return;
		const node = this.findbynode(this.currentnode);
		node.sec = node.sec == 0 ? 1 : 0;
		try { this.config.callback['sec'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action rn1Node = () => {
		if( !this.currentnode ) return;
		const node = this.findbynode(this.currentnode);
		this.editingnode = node;
		this.nodes.map( el => el.e = 0 );
		node.e = 1;
		try { this.config.callback['rn1'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action rn2Node = () => {
		if( !this.editingnode ) return;
		const node = this.findbynode(this.editingnode);
		if( !node.t ) node.t = "_";
		node.e = 0;
		try { this.config.callback['rn2'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action rn3Node = (e) => {
		if( !this.currentnode ) return;
		const node = this.findbynode(this.currentnode);
		node.t = "UPDATE";
		try { this.config.callback['rn3'](node) } catch(err) { console.log(err) };
		return true;
	}
	@action clsNodes = () => {
		this.nodes.map( el => el.c = 1 );
		try { this.config.callback['cls'](null) } catch(err) { console.log(err) };
		return true;
	}
	@action opnNodes = () => {
		this.nodes.map( el => el.c = 0 );
		try { this.config.callback['opn'](null) } catch(err) { console.log(err) };
		return true;
	}
	@action prnNodes = () => {
		console.log(this.nodes);
		return true;
	}
	@action onChange = (e) => {
		if( !this.currentnode ) return;
		if( !this.currentnode.$mobx ) this.currentnode = this.findbynode(this.currentnode);
		// clearTimeout(this.edit_timeout); // performance
		const value = e.target.value;
		// this.edit_timeout = setTimeout(() => {
			this.currentnode.t = value;
		// }, 1);
	}
	@action onBlur = (e) => {
		this.rn2Node(e);
	}
	@action onKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.rn2Node(e);
    }
	}
	@action onDragStart(e, node, path) {
		e.dataTransfer.setData("text", e.target.dataset.nodeid);
		this.dnd_source = node;
	}
	@action onDragEnter(e, node, path) {
		this.dnd_target = this.findbynode(node);
		clearTimeout(this.dnd_toggle);
		if(node.c == 1) {
			this.dnd_toggle = setTimeout(() => {
				if(node.id == this.dnd_target.id) this.findbynode(node).c = 0;
			}, 900);
		}
	}
	@action onDragOver(e, node, path, treenode) {
		e.preventDefault(); // allowDrop
		// e.stopPropagation();
		const s_id = this.dnd_source.id;
		const t_id = parseInt(e.target.dataset.nodeid);
		if (isNaN(t_id) || s_id == t_id) return; // self to self
		const position = this.calcpos(e, treenode);
		clearTimeout(this.dnd_pass); // performance
		this.dnd_pass = setTimeout(() => {
			this.dnd_target.d = position;
		}, 1);
		// console.log(s_id, t_id);
	}
	@action onMouseOver(e, node, path) {
		/*
		clearTimeout(this.hover_timeout);
		this.hover_timeout = setTimeout(() => {
			const t_id = parseInt(e.target.dataset.nodeid);
			const t_node = this.findbyid( t_id );
			this.unfoldNode(e, node, path);
		}, 1500);
		*/
	}
	@action onDragLeave(e, node, path) {
		this.dnd_clear();
	}
	@action onDragEnd(e, node, path) {
		this.dnd_clear();
	}
	@action onDrop(e, node, path, treenode) {
		// e.preventDefault();
		// e.stopPropagation();
		const s_id = parseInt(e.dataTransfer.getData("text"));
		const t_id = parseInt(e.target.dataset.nodeid);
		// console.log(s_id, t_id);
		if (isNaN(t_id) || s_id == t_id) return; // self to self
		if (path.includes(s_id)) return; // parent to children
		const s_node = this.findbyid( s_id );
		const t_node = this.findbyid( t_id );

		const position = this.calcpos(e, treenode);
		switch(position){
			case 0: // middle
				const t_children = this.nodes.filter( el => el.pid == t_id );
				this.nodes.map( el => {
					if(el.id == s_id) {
						el.pid = t_id
						if(t_children.length == 0) {
							el.o = 0;
						} else {
							el.o = Math.max(...t_children.map(el => el.o)) + 1;
						}
					}
					if(el.id == t_id) el.c = 0;
					return el;
				});
				break;
			case -1: // above
			case 1: // below
				s_node.pid = t_node.pid; // set parent

				const p_children = this.nodes.filter( el => el.pid == t_node.pid ); // get siblings
				p_children.sort( (a,b) => a.o - b.o ); // sort by order

				const t_node_index = p_children.indexOf(t_node);
				if(t_node_index == 0) { // target node is first children
					if(position == -1) {
						s_node.o = t_node.o - 1;
					} else {
						const below_t_node = p_children[p_children.indexOf(t_node)+1]
						s_node.o = (t_node.o + below_t_node.o) / 2;
					}
				} else if(t_node_index == p_children.length - 1) { // target node is last children
					if(position == -1) {
						const above_t_node = p_children[p_children.indexOf(t_node)-1]
						s_node.o = (t_node.o + above_t_node.o) / 2;
					} else {
						s_node.o = t_node.o + 1;
					}
				} else { // target node is mid children
					if(position == -1) {
						const above_t_node = p_children[p_children.indexOf(t_node)-1]
						s_node.o = (t_node.o + above_t_node.o) / 2;
					} else {
						const below_t_node = p_children[p_children.indexOf(t_node)+1]
						s_node.o = (t_node.o + below_t_node.o) / 2;
					}
				}

				p_children.sort( (a,b) => a.o - b.o ); // sort again

				break;
		}
		// console.log(node.t, position);
		this.dnd_clear();
		try { this.config.callback['dnd'](s_node) } catch(err) { console.log(err) };
		// console.log(s_id, t_id, path, path.includes(s_id), position);
	}
	@action calcpos(e, treenode) {
		let position = 0;
		const DRAG_SIDE_RANGE = 0.35, DRAG_MIN_GAP = 2;
		const { top, bottom, height } = treenode.selectHandle.getBoundingClientRect();
		const des = Math.max(height * DRAG_SIDE_RANGE, DRAG_MIN_GAP);
		if (e.clientY <= top + des) position =  -1;
		if (e.clientY >= bottom - des) position =  1;
		return position;
	}

	@computed
	get nodetree() {
		// console.log('computed');
		let data = JSON.parse(JSON.stringify(this.nodes)); // force render
		var roots = [], children = {};
		for (var i = 0, len = data.length; i < len; ++i) { /* find the top level nodes and hash the children based on parent */
			var item = data[i];
			var p = item.pid;
			var target = !p ? roots : (children[p] || (children[p] = []));
			target.push(item);
		}
		var findChildren = function(parent) {
			if (children[parent.id]) {
				parent.children = children[parent.id];
				parent.children.sort( (a,b) => a.o - b.o ); // 추가
				for (var i = 0, len = parent.children.length; i < len; ++i) {
					findChildren(parent.children[i]);
				}
			}
		};
		roots.sort( (a,b) => a.o - b.o ); /* 추가 */
		for (var i = 0, len = roots.length; i < len; ++i) { /* enumerate through to handle the case where there are multiple roots */
			findChildren(roots[i]);
		}
		this.roots = {children:roots.slice()};
		return roots;
	}
}

@inject('store')
@observer
class Tree_ extends React.Component {
	constructor(props){
		super(props);
	}
	store = this.props.store;

	componentDidMount() {
		window.onkeydown = (e) => {
			if(e.which == 113) { // f2
				this.store.rn1Node();
			} else if(e.shiftKey && e.which == 187) { // shift + '+'
				this.store.addNode()
			} else if(e.shiftKey && e.which == 45) { // shift + insert
				this.store.addNode()
			} else if(e.shiftKey && e.which == 46) { // shift + del
				if(confirm("DELETE?")) this.store.delNode()
			} else if (e.ctrlKey || e.metaKey) {
				if (String.fromCharCode(e.which).toLowerCase() == 's') { // ctrl + s
					e.preventDefault();
					this.store.updNode()
				}
			}
		};
	}

	render() {
		// console.log('tree render');
		return (
			<>
				<ul className="rebo-tree">
					{this.store.nodetree.map((node, index) =>
							<TreeNode
												key={node.id || index}
												node={node}
												store={this.store}
												path={[]}
							/>
					)}
				</ul>
			</>
		)
	}
}

@observer
class TreeNode extends React.Component {
	constructor(props){
		super(props);
	}
  setSelectHandle = (node) => { //ref (drag)
    this.selectHandle = node;
  };
	renderChildren() {
		const {node, store, path} = this.props;
		if (node.c) return null;
		let children = node.children;
		if(children == undefined || children.length == 0) children = [];

		let path_ = path.slice();
		path_.push(node.id);

		return (
			<ul>
				{children.map( (child, index) =>
							<TreeNode
												key={child.id || index}
												node={child}
												store={store}
												path={path_}
							/>
				)}
			</ul>
		);
	}
	render() {
		const {node, store, path} = this.props;
		const {children, c} = node;
		// console.log('treenode render');
		const path_ = path.slice();
		path_.push(node.id);
    return (
      <>
				<li>
				{/* <Paper> */}
						<span data-nodeid={node.id} className={["title", "d"+node.d, "s"+node.s, "sec"+node.sec, "e"+node.e].join(" ")}
															onClick={() => store.selectNode(event, node, path_)}
															draggable="true"
															onDragStart={() => store.onDragStart(event, node, path_)}
															onDragEnter={() => store.onDragEnter(event, node, path_)}
															onDragOver={() => store.onDragOver(event, node, path_, this)}
															onDragLeave={() => store.onDragLeave(event, node, path_)}
															onDragEnd={() => store.onDragEnd(event, node, path_)}
															onDrop={() => store.onDrop(event, node, path_, this)}
															onMouseOver={() => store.onMouseOver(event, node, path_)}
															ref={this.setSelectHandle}
						>
							{node.e == 1 ?
								<em data-nodeid={node.id} >
									<input
												autoFocus
												value={node.t}
												onChange={store.onChange}
												onBlur={store.onBlur}
												onKeyPress={store.onKeyPress}
									/>
								</em>
								:
								<em data-nodeid={node.id} >{node.t}</em>
							}
							{
								children != undefined && children.length > 0 ?
									c ?
										<span onClick={(event) => store.unfoldNode(event, node, path_)} className="arrow">▷</span>
									:
										<span onClick={(event) => store.foldNode(event, node, path_)} className="arrow">▽</span>
								:
								<span className="arrow">　</span>
							}
						</span>
					{/* </Paper> */}
					{this.renderChildren()}
				</li>
      </>
    )
  }
}


// export default class RTree -> import Tree from './Tree' -> Tree == RTree
// export default class JTree -> import Tree from './Tree' -> Tree == JTree
// export class RTree -> import RTree from './Tree'
// export class JTree -> import JTree from './Tree'

export default class RTree extends React.Component { // 웹팩 사용하는 리액트 콤포넌트로 내보낼 때 (의존성:리액트,MUI,mobx)
	constructor(props){
		super(props);
		this.store = new TreeStore(props.treeoption);
	}
	render() {
    return (
			<>
				{/*
					<Button onClick={this.store.updNode}>UPD</Button>
					<Button onClick={this.store.addNode}>ADD</Button>
					<Button onClick={this.store.delNode}>DEL</Button>
					<Button onClick={this.store.secNode}>SEC</Button>
					<Button onClick={this.store.rn1Node}>RN1</Button>
					<Button onClick={this.store.rn2Node}>RN2</Button>
					<Button onClick={this.store.rn3Node}>RN3</Button>
					<Button onClick={this.store.clsNodes}>CLS</Button>
					<Button onClick={this.store.opnNodes}>OPN</Button>
					<Button onClick={this.store.prnNodes}>PRN</Button>
					<Button onClick={this.store.tojson}>JSON</Button>
				*/}
				<Provider store={this.store}>
					<Tree_ />
				</Provider>
			</>
    )
  }
}

export class JTree { // 웹팩 사용하지 않는 범용 라이브러리로 내보낼 때 (의존성:리액트,MUI,mobx)

	constructor(treeoption) {
		this.treeoption = treeoption
		this.store = new TreeStore(this.treeoption);
		this.render()
	}

	get node() {
		return this.store.currentnode;
	}
	get id() {
		return this.store.currentnode.id;
	}
	get t() {
		return this.store.currentnode.t;
	}

	add(fn) {
		return this.store.addNode()
	}
	save(fn) {
		return this.store.updNode()
	}
	rename(fn) {
		return this.store.rn1Node()
	}
	del(fn) {
		return this.store.delNode();
	}

	render() {
		ReactDOM.render(
			<>
				{/*			
					<Button onClick={this.store.updNode}>UPD</Button>
					<Button onClick={this.store.addNode}>ADD</Button>
					<Button onClick={this.store.delNode}>DEL</Button>
					<Button onClick={this.store.secNode}>SEC</Button>
					<Button onClick={this.store.rn1Node}>RN1</Button>
					<Button onClick={this.store.rn2Node}>RN2</Button>
					<Button onClick={this.store.rn3Node}>RN3</Button>
					<Button onClick={this.store.clsNodes}>CLS</Button>
					<Button onClick={this.store.opnNodes}>OPN</Button>
					<Button onClick={this.store.prnNodes}>PRN</Button>
					<Button onClick={this.store.tojson}>JSON</Button>
				*/}					
				<Provider store={this.store}>
					<Tree_ />
				</Provider>
			</>,
			document.getElementById(this.treeoption.el)
		);
	}

}